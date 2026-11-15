export default function RootLoading() {
    return (
        <div
            aria-busy="true"
            aria-label="Loading"
            style={{ maxWidth: 980, margin: "0 auto", padding: "130px 24px 60px" }}
        >
            <div
                style={{
                    width: 180,
                    height: 16,
                    borderRadius: 6,
                    background: "#e7edf6",
                    marginBottom: 18,
                }}
            />
            <div
                style={{
                    width: "70%",
                    height: 44,
                    borderRadius: 8,
                    background: "#e7edf6",
                    marginBottom: 14,
                }}
            />
            <div style={{ display: "grid", gap: 10 }}>
                {[0, 1, 2].map((i) => (
                    <div
                        key={i}
                        style={{
                            width: i === 2 ? "55%" : "100%",
                            height: 15,
                            borderRadius: 6,
                            background: "#eef2f8",
                        }}
                    />
                ))}
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 26 }}>
                <div style={{ width: 170, height: 46, borderRadius: 9, background: "#2855d9", opacity: 0.85 }} />
                <div style={{ width: 170, height: 46, borderRadius: 9, background: "#e7edf6" }} />
            </div>
        </div>
    );
}
