import { Skeleton, Card } from "antd";

const bar = (width: number | string, height: number, color = "#e7edf6") => (
    <div style={{ width, height, borderRadius: 7, background: color }} />
);

export default function DashboardLoading() {
    return (
        <div aria-busy="true" aria-label="Loading">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
                {bar(240, 30)}
                {bar(150, 38, "#dbe7fd")}
            </div>
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                    gap: 16,
                    marginBottom: 20,
                }}
            >
                {[0, 1, 2, 3].map((i) => (
                    <Card key={i}>
                        <Skeleton active paragraph={{ rows: 1 }} title={{ width: "55%" }} />
                    </Card>
                ))}
            </div>
            <Card>
                <Skeleton active paragraph={{ rows: 6 }} />
            </Card>
        </div>
    );
}
