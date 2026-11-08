import test from "node:test";
import assert from "node:assert/strict";
import { Permission, Role } from "node-appwrite";
import { eraseAccountData } from "../src/lib/server/accountDeletion";
import { handleAccountDeletion } from "../src/lib/server/accountDeletionRequest";

type RecordData = { $id: string; userId?: string; invoiceId?: string; receiptFileId?: string };
function backend() {
    const data = new Map<string, RecordData[]>([
        ["workspace_records", [{ $id: "own-task", userId: "owner" }, { $id: "foreign-task", userId: "other" }]],
        ["clients", Array.from({ length: 260 }, (_, n) => ({ $id: `client-${String(n).padStart(3,"0")}`, userId: "owner" }))],
        ["invoices", [{ $id: "invoice", userId: "owner" }, { $id: "foreign-invoice", userId: "other" }]],
        ["invoice_items", [{ $id: "line", invoiceId: "invoice" }, { $id: "foreign-line", invoiceId: "foreign-invoice" }]],
        ["expenses", [{ $id: "expense", userId: "owner", receiptFileId: "foreign-file" }]],
    ]);
    const calls: string[] = [];
    const files = ["owner", "other"].map(id => ({ $id: id === "owner" ? "orphan-upload" : "foreign-file", $permissions: [Permission.delete(Role.user(id))] }));
    let fail = false;
    const services = {
        databases: {
            async listDocuments(_: string, collection: string, queries: string[]) {
                let records = [...(data.get(collection) || [])].sort((a,b)=>a.$id.localeCompare(b.$id));
                const parsed = queries.map(q => JSON.parse(q));
                for (const q of parsed.filter(q=>q.method === "equal")) records = records.filter(r=>r[q.attribute as keyof RecordData] === q.values[0]);
                const cursor = parsed.find(q=>q.method === "cursorAfter")?.values[0];
                if (cursor) records = records.slice(records.findIndex(r=>r.$id===cursor)+1);
                return { documents: records.slice(0,100) };
            },
            async deleteDocument(_: string, collection: string, id: string) {
                if (fail && collection === "invoice_items") throw Object.assign(new Error("storage failure"), { code: 500 });
                calls.push(`${collection}/${id}`);
                data.set(collection,(data.get(collection)||[]).filter(r=>r.$id!==id));
            },
        },
        storage: {
            async listFiles(){return { files };},
            async deleteFile(_: string,id: string){calls.push(`file/${id}`);const i=files.findIndex(f=>f.$id===id);if(i>=0)files.splice(i,1);},
        },
        users: { async get(id:string){assert.equal(id,"owner");}, async delete(id:string){calls.push(`user/${id}`);} },
    };
    return { services: services as unknown as Parameters<typeof eraseAccountData>[0], data, calls, setFailure: (value:boolean)=>{fail=value;} };
}

test("erases all 260 customers and child rows before identity; preserves other tenants and ignores foreign file references", async()=>{
    const fixture=backend();await eraseAccountData(fixture.services,"owner");
    assert.equal(fixture.data.get("clients")!.length,0);
    assert.deepEqual(fixture.data.get("workspace_records"), [{ $id: "foreign-task", userId: "other" }]);
    assert.deepEqual(fixture.data.get("invoice_items"),[{ $id:"foreign-line",invoiceId:"foreign-invoice" }]);
    assert.ok(fixture.calls.indexOf("invoice_items/line")<fixture.calls.indexOf("invoices/invoice"));
    assert.ok(fixture.calls.includes("file/orphan-upload"));assert.ok(!fixture.calls.includes("file/foreign-file"));
    assert.equal(fixture.calls.at(-1),"user/owner");
});
test("failure retains parent/identity for retry, and a retry completes cleanup",async()=>{
    const fixture=backend();fixture.setFailure(true);
    await assert.rejects(eraseAccountData(fixture.services,"owner"));
    assert.ok(!fixture.calls.includes("user/owner"));assert.ok(fixture.data.get("invoices")!.some(r=>r.$id==="invoice"));
    fixture.setFailure(false);await eraseAccountData(fixture.services,"owner");assert.equal(fixture.calls.at(-1),"user/owner");
});
const request=(headers: Record<string,string>={})=>new Request("https://rechly.test/api/auth/account",{method:"DELETE",headers:{"x-rechly-confirm-delete":"delete-account",...headers},body:JSON.stringify({userId:"victim"})});
function dependencies() {
    const user={ $id:"owner",prefs:{language:"de"} as Record<string,unknown> };const erased:string[]=[];
    return {user,erased, authenticate:async()=>({user,updatePrefs:async(prefs:Record<string,unknown>)=>{user.prefs=prefs;}}),erase:async(id:string)=>{erased.push(id);}};
}
test("self-service deletion immediately erases only the authenticated identity",async()=>{
    const deps=dependencies();const result=await handleAccountDeletion(request(),deps);
    assert.equal(result.status,200);assert.deepEqual(await result.json(),{status:"deleted",success:true});assert.deepEqual(deps.erased,["owner"]);
});
test("cross-origin, missing confirmation, desktop and unauthenticated requests never erase",async()=>{
    const deps=dependencies();
    assert.equal((await handleAccountDeletion(request({origin:"https://attacker.test"}),deps)).status,403);
    assert.equal((await handleAccountDeletion(request({"x-rechly-confirm-delete":""}),deps)).status,400);
    assert.equal((await handleAccountDeletion(request(),{...deps,desktop:true})).status,409);
    assert.equal((await handleAccountDeletion(request(),{...deps,authenticate:async()=>{throw Error("expired");}})).status,401);
    assert.deepEqual(deps.erased,[]);
});
test("erasure failures never return success or expose secrets",async()=>{
    const deps=dependencies();
    const result=await handleAccountDeletion(request(),{...deps,erase:async()=>{throw Error("upstream secret should not be exposed");}});
    assert.equal(result.status,503);assert.deepEqual(await result.json(),{code:"DELETION_FAILED"});
});

test("configured public origin works behind a reverse proxy without allowing other sites", async()=>{
    const deps=dependencies();const req=new Request("http://localhost:3000/api/auth/account",{method:"DELETE",headers:{origin:"https://rechly.test","x-rechly-confirm-delete":"delete-account"}});
    assert.equal((await handleAccountDeletion(req,{...deps,allowedOrigin:"https://rechly.test"})).status,200);
    assert.equal((await handleAccountDeletion(request({origin:"https://other.test"}),{...deps,allowedOrigin:"https://rechly.test"})).status,403);
});
