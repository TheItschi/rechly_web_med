import test from "node:test";
import assert from "node:assert/strict";
import { writeClientWithMetadata, ClientMetadataUnavailableError } from "../src/lib/server/clientMetadata";
import { eInvoiceWrite, readEInvoiceData } from "../src/lib/eRechnung/identifiers";

const missing = () => Object.assign(new Error('Invalid document structure: Unknown attribute: "eInvoiceData"'), { code: 400 });
const delivery = { name: "Test Lager", street: "Lieferstraße 12", postal_code: "10115", city: "Berlin", country: "DE", identifier: undefined };
const data = { userId: "owner", name: "Test Kunde", ...eInvoiceWrite({ delivery_locations: [delivery] }) };
type DB = Parameters<typeof writeClientWithMetadata>[0];
function fixture(options: { ready?: boolean; concurrent?: boolean; deny?: boolean; stuck?: boolean; incompatible?: boolean } = {}) {
    let exists = !!options.ready;
    let polls = 0, creates = 0, attempts = 0;
    const stored: Record<string, unknown> = {};
    const field = { type: "string", size: 16000, required: false, array: false, status: "available" };
    const db = {
        async getAttribute(...args: unknown[]) {
            assert.deepEqual(args, ["rechly-db", "clients", "eInvoiceData"]);
            if (!exists) throw Object.assign(new Error("missing"), { code: 404 });
            polls++;
            return { ...field, size: options.incompatible ? 255 : 16000, status: options.stuck || polls < 2 ? "processing" : "available" };
        },
        async createStringAttribute(...args: unknown[]) {
            // Created oversized on purpose: Appwrite then stores the column
            // off-row instead of as an inline VARCHAR (row-size limit).
            assert.deepEqual(args, ["rechly-db", "clients", "eInvoiceData", 1000000, false]);
            creates++;
            if (options.deny) throw Object.assign(new Error("private backend detail"), { code: 403 });
            exists = true;
            if (options.concurrent) throw Object.assign(new Error("exists"), { code: 409 });
        },
    } as unknown as DB;
    const write = async (values: Record<string, unknown>) => {
        attempts++;
        if (Object.hasOwn(values, "eInvoiceData") && (!exists || (!options.ready && polls < 2))) throw missing();
        Object.assign(stored, values);
        return { ...stored };
    };
    return { db, write, stored, counts: () => ({ polls, creates, attempts }) };
}
const pause = async () => {};

test("missing customer metadata field is repaired and delivery address is persisted without losing other data", async () => {
    const f = fixture();
    const result = await writeClientWithMetadata(f.db, data, f.write, pause);
    assert.deepEqual(readEInvoiceData(result.eInvoiceData).delivery_locations, [delivery]);
    assert.equal(result.name, data.name); assert.equal(result.userId, "owner");
    assert.deepEqual(f.counts(), { polls: 2, creates: 1, attempts: 2 });
    assert.equal(data.eInvoiceData, eInvoiceWrite({delivery_locations:[delivery]}).eInvoiceData);
});

test("updates preserve metadata when omitted and allow explicit removal with a current schema", async () => {
    const f = fixture({ready:true});
    await writeClientWithMetadata(f.db, data, f.write, pause);
    await writeClientWithMetadata(f.db, {name:"Updated"}, f.write, pause);
    assert.deepEqual(readEInvoiceData(f.stored.eInvoiceData).delivery_locations, [delivery]);
    await writeClientWithMetadata(f.db, eInvoiceWrite({delivery_locations:[]}), f.write, pause);
    assert.deepEqual(readEInvoiceData(f.stored.eInvoiceData).delivery_locations, []);
    assert.deepEqual(f.counts(), { polls: 0, creates: 0, attempts: 3 });
});

test("unused metadata does not require schema permissions on legacy projects", async () => {
    for (const empty of [{}, {delivery_locations:[]}]) {
        const f = fixture({deny:true});
        const result = await writeClientWithMetadata(f.db, {name:"Basic customer",...eInvoiceWrite(empty)}, f.write, pause);
        assert.equal(result.name,"Basic customer"); assert.equal(result.eInvoiceData,undefined);
        assert.deepEqual(f.counts(),{polls:0,creates:0,attempts:2});
    }
});

test("concurrent provisioning is idempotent and waits for Appwrite availability", async () => {
    const f = fixture({concurrent:true});
    const result = await writeClientWithMetadata(f.db,data,f.write,pause);
    assert.deepEqual(readEInvoiceData(result.eInvoiceData).delivery_locations,[delivery]);
    assert.equal(f.counts().attempts,2);
});

test("denied, incompatible and pending schemas fail without saving a customer minus its address", async () => {
    for (const options of [{deny:true},{incompatible:true},{stuck:true}]) {
        const f = fixture(options);
        await assert.rejects(writeClientWithMetadata(f.db,data,f.write,pause), e => {
            assert.ok(e instanceof ClientMetadataUnavailableError);
            assert.ok(!e.message.includes("private backend detail"));
            return true;
        });
        assert.deepEqual(f.stored,{}); assert.equal(f.counts().attempts,1);
        assert.ok(f.counts().polls <= 20);
    }
});

test("unrelated validation failures and network errors are never retried or provisioned", async () => {
    for (const error of [new Error("timeout"),Object.assign(new Error('Unknown attribute: "other"'),{code:400}),Object.assign(missing(),{code:403})]) {
        const f = fixture(); let attempts = 0;
        await assert.rejects(writeClientWithMetadata(f.db,data,async () => { attempts++; throw error; },pause), e => e === error);
        assert.equal(attempts,1); assert.equal(f.counts().creates,0);
    }
});

test("schema propagation failure after availability returns a retryable error without unbounded retries", async () => {
    const f = fixture(); let attempts = 0;
    await assert.rejects(writeClientWithMetadata(f.db,data,async () => { attempts++; throw missing(); },pause),ClientMetadataUnavailableError);
    assert.equal(attempts,2);
});
