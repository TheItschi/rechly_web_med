import type {
    AnalyticsAnomaly,
    ClientRiskScore,
    CustomerSegment,
    DashboardAnalytics,
    KPIInsight,
} from "@/types";

export type InvoiceDoc = {
    $id: string;
    clientId?: string;
    invoiceNumber?: string;
    issueDate?: string;
    dueDate?: string;
    totalGross?: number;
    status?: "draft" | "sent" | "paid" | "cancelled";
    $createdAt: string;
    $updatedAt: string;
};

export type ClientDoc = {
    $id: string;
    name?: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function toDate(value?: string): Date | null {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

function startOfDay(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value));
}

function percentile(sorted: number[], p: number): number {
    if (sorted.length === 0) return 0;
    const index = (sorted.length - 1) * p;
    const low = Math.floor(index);
    const high = Math.ceil(index);
    if (low === high) return sorted[low];
    const weight = index - low;
    return sorted[low] * (1 - weight) + sorted[high] * weight;
}

function makeRiskLevel(score: number): "low" | "medium" | "high" {
    if (score >= 0.67) return "high";
    if (score >= 0.34) return "medium";
    return "low";
}

type ClientRiskBucket = {
    paidWithDue: number;
    latePaid: number;
    sumLateDays: number;
    overdueOpen: number;
    totalOpen: number;
};

type ClientPaidHistory = {
    paidWithDue: number;
    latePaid: number;
    sumLateDays: number;
};

type LatePaymentTrainingRow = {
    timestamp: number;
    features: number[];
    label: 0 | 1;
};

type LogisticRegressionModel = {
    weights: number[];
    bias: number;
    means: number[];
    stds: number[];
    validationAccuracy: number;
    validationLogLoss: number;
};

function sigmoid(value: number): number {
    if (value >= 0) {
        const z = Math.exp(-value);
        return 1 / (1 + z);
    }
    const z = Math.exp(value);
    return z / (1 + z);
}

function dotProduct(a: number[], b: number[]): number {
    let sum = 0;
    for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
    return sum;
}

function makeLatePaymentFeatureVector(
    invoice: InvoiceDoc,
    history: ClientPaidHistory,
): number[] | null {
    const dueDate = toDate(invoice.dueDate);
    if (!dueDate) return null;

    const issueDate =
        toDate(invoice.issueDate) || toDate(invoice.$createdAt) || dueDate;
    const amount = Math.max(0, invoice.totalGross ?? 0);
    const termDays = Math.max(
        0,
        Math.floor(
            (startOfDay(dueDate).getTime() - startOfDay(issueDate).getTime()) /
                DAY_MS,
        ),
    );

    const smoothedLateRate = (history.latePaid + 1) / (history.paidWithDue + 2);
    const avgLateDays =
        history.latePaid > 0 ? history.sumLateDays / history.latePaid : 0;

    const monthAngle = ((dueDate.getMonth() + 1) / 12) * 2 * Math.PI;

    return [
        Math.log1p(amount),
        clamp(termDays / 90, 0, 2),
        clamp(smoothedLateRate, 0, 1),
        clamp(avgLateDays / 45, 0, 2),
        Math.sin(monthAngle),
        Math.cos(monthAngle),
    ];
}

function trainTemporalLogisticRegression(
    rows: LatePaymentTrainingRow[],
): LogisticRegressionModel | null {
    const minSamples = 40;
    if (rows.length < minSamples) return null;

    const sorted = [...rows].sort((a, b) => a.timestamp - b.timestamp);
    const splitIndex = Math.min(
        sorted.length - 1,
        Math.max(1, Math.floor(sorted.length * 0.8)),
    );

    const trainRows = sorted.slice(0, splitIndex);
    const validationRows = sorted.slice(splitIndex);

    const hasBothClasses = (dataset: LatePaymentTrainingRow[]) => {
        let has0 = false;
        let has1 = false;
        for (const row of dataset) {
            if (row.label === 0) has0 = true;
            else has1 = true;
            if (has0 && has1) return true;
        }
        return false;
    };

    if (!hasBothClasses(trainRows) || !hasBothClasses(sorted)) return null;

    const featureCount = trainRows[0]?.features.length ?? 0;
    if (featureCount === 0) return null;

    const means = Array<number>(featureCount).fill(0);
    const stds = Array<number>(featureCount).fill(1);

    for (const row of trainRows) {
        for (let i = 0; i < featureCount; i++) means[i] += row.features[i];
    }
    for (let i = 0; i < featureCount; i++) means[i] /= trainRows.length;

    for (const row of trainRows) {
        for (let i = 0; i < featureCount; i++) {
            const diff = row.features[i] - means[i];
            stds[i] += diff * diff;
        }
    }
    for (let i = 0; i < featureCount; i++) {
        stds[i] = Math.sqrt(stds[i] / trainRows.length);
        if (!Number.isFinite(stds[i]) || stds[i] < 1e-6) stds[i] = 1;
    }

    const normalize = (features: number[]) =>
        features.map((value, i) => (value - means[i]) / stds[i]);

    const normalizedTrain = trainRows.map((row) => ({
        x: normalize(row.features),
        y: row.label,
    }));
    const normalizedValidation = validationRows.map((row) => ({
        x: normalize(row.features),
        y: row.label,
    }));

    const weights = Array<number>(featureCount).fill(0);
    let bias = 0;

    const learningRate = 0.08;
    const l2 = 0.0015;
    const epochs = 220;

    for (let epoch = 0; epoch < epochs; epoch++) {
        const gradW = Array<number>(featureCount).fill(0);
        let gradB = 0;

        for (const row of normalizedTrain) {
            const prediction = sigmoid(dotProduct(weights, row.x) + bias);
            const error = prediction - row.y;
            for (let i = 0; i < featureCount; i++) gradW[i] += error * row.x[i];
            gradB += error;
        }

        const scale = 1 / normalizedTrain.length;
        for (let i = 0; i < featureCount; i++) {
            const regularizedGrad = gradW[i] * scale + l2 * weights[i];
            weights[i] -= learningRate * regularizedGrad;
        }
        bias -= learningRate * gradB * scale;
    }

    let correct = 0;
    let logLoss = 0;
    const eps = 1e-8;

    for (const row of normalizedValidation) {
        const p = sigmoid(dotProduct(weights, row.x) + bias);
        const predicted = p >= 0.5 ? 1 : 0;
        if (predicted === row.y) correct += 1;
        logLoss += -(
            row.y * Math.log(p + eps) +
            (1 - row.y) * Math.log(1 - p + eps)
        );
    }

    const validationAccuracy =
        normalizedValidation.length > 0
            ? correct / normalizedValidation.length
            : 0;
    const validationLogLoss =
        normalizedValidation.length > 0
            ? logLoss / normalizedValidation.length
            : Number.POSITIVE_INFINITY;

    if (!Number.isFinite(validationLogLoss)) return null;

    return {
        weights,
        bias,
        means,
        stds,
        validationAccuracy,
        validationLogLoss,
    };
}

function predictLatePaymentProbability(
    model: LogisticRegressionModel,
    rawFeatures: number[],
): number {
    const normalized = rawFeatures.map(
        (value, i) => (value - model.means[i]) / model.stds[i],
    );
    return sigmoid(dotProduct(model.weights, normalized) + model.bias);
}

export function computeAnalytics(
    invoices: InvoiceDoc[],
    clients: ClientDoc[],
): DashboardAnalytics {
    const now = new Date();
    const nowStart = startOfDay(now);

    const activeInvoices = invoices.filter(
        (invoice) => invoice.status !== "cancelled",
    );
    const paidInvoices = activeInvoices.filter(
        (invoice) => invoice.status === "paid",
    );
    const openInvoices = activeInvoices.filter(
        (invoice) => invoice.status === "draft" || invoice.status === "sent",
    );

    const clientNameMap = new Map<string, string>();
    clients.forEach((client) => {
        if (client.$id) {
            clientNameMap.set(client.$id, client.name || "Unknown client");
        }
    });

    // --- Late-payment risk (client-level) ---
    const riskByClient = new Map<string, ClientRiskBucket>();

    const ensureRisk = (clientId: string) => {
        if (!riskByClient.has(clientId)) {
            riskByClient.set(clientId, {
                paidWithDue: 0,
                latePaid: 0,
                sumLateDays: 0,
                overdueOpen: 0,
                totalOpen: 0,
            });
        }
        return riskByClient.get(clientId)!;
    };

    for (const invoice of activeInvoices) {
        if (!invoice.clientId) continue;
        const bucket = ensureRisk(invoice.clientId);
        const dueDate = toDate(invoice.dueDate);

        if (invoice.status === "paid" && dueDate) {
            bucket.paidWithDue += 1;
            const paidDate = toDate(invoice.$updatedAt) || now;
            const lateDays = Math.max(
                0,
                Math.floor(
                    (startOfDay(paidDate).getTime() -
                        startOfDay(dueDate).getTime()) /
                        DAY_MS,
                ),
            );
            if (lateDays > 0) {
                bucket.latePaid += 1;
                bucket.sumLateDays += lateDays;
            }
        }

        if (
            (invoice.status === "draft" || invoice.status === "sent") &&
            dueDate
        ) {
            bucket.totalOpen += 1;
            if (startOfDay(dueDate).getTime() < nowStart.getTime()) {
                bucket.overdueOpen += 1;
            }
        }
    }

    const clientPaidHistory = new Map<string, ClientPaidHistory>();
    const ensurePaidHistory = (clientId: string) => {
        if (!clientPaidHistory.has(clientId)) {
            clientPaidHistory.set(clientId, {
                paidWithDue: 0,
                latePaid: 0,
                sumLateDays: 0,
            });
        }
        return clientPaidHistory.get(clientId)!;
    };

    const paidTrainingRows: LatePaymentTrainingRow[] = [];
    const paidForTraining = paidInvoices
        .filter((invoice) => !!invoice.clientId && !!toDate(invoice.dueDate))
        .sort((a, b) => {
            const aDue = startOfDay(toDate(a.dueDate) || now).getTime();
            const bDue = startOfDay(toDate(b.dueDate) || now).getTime();
            if (aDue !== bDue) return aDue - bDue;
            const aPaid = startOfDay(toDate(a.$updatedAt) || now).getTime();
            const bPaid = startOfDay(toDate(b.$updatedAt) || now).getTime();
            return aPaid - bPaid;
        });

    for (const invoice of paidForTraining) {
        const clientId = invoice.clientId!;
        const history = ensurePaidHistory(clientId);
        const dueDate = toDate(invoice.dueDate);
        const featureVector = makeLatePaymentFeatureVector(invoice, history);

        if (!dueDate || !featureVector) continue;

        const paidDate = toDate(invoice.$updatedAt) || now;
        const lateDays = Math.max(
            0,
            Math.floor(
                (startOfDay(paidDate).getTime() -
                    startOfDay(dueDate).getTime()) /
                    DAY_MS,
            ),
        );
        const label: 0 | 1 = lateDays > 0 ? 1 : 0;

        paidTrainingRows.push({
            timestamp: startOfDay(dueDate).getTime(),
            features: featureVector,
            label,
        });

        history.paidWithDue += 1;
        if (lateDays > 0) {
            history.latePaid += 1;
            history.sumLateDays += lateDays;
        }
    }

    const latePaymentModel = trainTemporalLogisticRegression(paidTrainingRows);

    const buildHeuristicRisk = (): ClientRiskScore[] =>
        Array.from(riskByClient.entries())
            .map(([clientId, bucket]) => {
                const lateRate =
                    bucket.paidWithDue > 0
                        ? bucket.latePaid / bucket.paidWithDue
                        : 0;
                const averageDaysLate =
                    bucket.latePaid > 0
                        ? bucket.sumLateDays / bucket.latePaid
                        : 0;
                const overdueOpenRate =
                    bucket.totalOpen > 0
                        ? bucket.overdueOpen / bucket.totalOpen
                        : 0;

                const score = clamp(
                    lateRate * 0.5 +
                        clamp(averageDaysLate / 30, 0, 1) * 0.3 +
                        overdueOpenRate * 0.2,
                    0,
                    1,
                );

                return {
                    clientId,
                    clientName: clientNameMap.get(clientId) || "Unknown client",
                    riskScore: Number(score.toFixed(3)),
                    riskLevel: makeRiskLevel(score),
                    lateRate: Number((lateRate * 100).toFixed(1)),
                    averageDaysLate: Number(averageDaysLate.toFixed(1)),
                    overdueOpenInvoices: bucket.overdueOpen,
                };
            })
            .sort((a, b) => b.riskScore - a.riskScore);

    const latePaymentRisk: ClientRiskScore[] = latePaymentModel
        ? (() => {
              const openProbabilityByClient = new Map<
                  string,
                  { sum: number; count: number }
              >();

              for (const invoice of openInvoices) {
                  if (!invoice.clientId) continue;
                  const history = clientPaidHistory.get(invoice.clientId) || {
                      paidWithDue: 0,
                      latePaid: 0,
                      sumLateDays: 0,
                  };

                  const features = makeLatePaymentFeatureVector(
                      invoice,
                      history,
                  );
                  if (!features) continue;

                  const probability = predictLatePaymentProbability(
                      latePaymentModel,
                      features,
                  );

                  const aggregate = openProbabilityByClient.get(
                      invoice.clientId,
                  ) || {
                      sum: 0,
                      count: 0,
                  };
                  aggregate.sum += probability;
                  aggregate.count += 1;
                  openProbabilityByClient.set(invoice.clientId, aggregate);
              }

              return Array.from(riskByClient.entries())
                  .map(([clientId, bucket]) => {
                      const lateRate =
                          bucket.paidWithDue > 0
                              ? bucket.latePaid / bucket.paidWithDue
                              : 0;
                      const averageDaysLate =
                          bucket.latePaid > 0
                              ? bucket.sumLateDays / bucket.latePaid
                              : 0;

                      const clientOpen = openProbabilityByClient.get(clientId);
                      const historicalPrior =
                          bucket.paidWithDue > 0 ? lateRate : 0.35;
                      const mlScore =
                          clientOpen && clientOpen.count > 0
                              ? clientOpen.sum / clientOpen.count
                              : historicalPrior;

                      const score = clamp(mlScore, 0, 1);

                      return {
                          clientId,
                          clientName:
                              clientNameMap.get(clientId) || "Unknown client",
                          riskScore: Number(score.toFixed(3)),
                          riskLevel: makeRiskLevel(score),
                          lateRate: Number((lateRate * 100).toFixed(1)),
                          averageDaysLate: Number(averageDaysLate.toFixed(1)),
                          overdueOpenInvoices: bucket.overdueOpen,
                      };
                  })
                  .sort((a, b) => b.riskScore - a.riskScore);
          })()
        : buildHeuristicRisk();

    const riskMap = new Map(
        latePaymentRisk.map((risk) => [risk.clientId, risk.riskScore]),
    );

    // --- Revenue forecasting ---
    const paidDailySeries = new Map<string, number>();
    const paidAmounts = paidInvoices.map((invoice) => invoice.totalGross ?? 0);

    for (const invoice of paidInvoices) {
        const amount = invoice.totalGross ?? 0;
        const date =
            toDate(invoice.$updatedAt) || toDate(invoice.issueDate) || now;
        const key = startOfDay(date).toISOString().slice(0, 10);
        paidDailySeries.set(key, (paidDailySeries.get(key) || 0) + amount);
    }

    const avgLast = (days: number) => {
        let total = 0;
        for (let i = 0; i < days; i++) {
            const date = new Date(nowStart.getTime() - i * DAY_MS);
            const key = date.toISOString().slice(0, 10);
            total += paidDailySeries.get(key) || 0;
        }
        return days > 0 ? total / days : 0;
    };

    const baseDaily30 = avgLast(30);
    const baseDaily90 = avgLast(90);

    const expectedCollections = (horizonDays: number) => {
        const horizonEnd = new Date(nowStart.getTime() + horizonDays * DAY_MS);
        return openInvoices
            .filter((invoice) => {
                const dueDate =
                    toDate(invoice.dueDate) || toDate(invoice.issueDate);
                return (
                    !!dueDate && dueDate >= nowStart && dueDate <= horizonEnd
                );
            })
            .reduce((sum, invoice) => {
                const amount = invoice.totalGross ?? 0;
                const statusWeight = invoice.status === "sent" ? 0.85 : 0.6;
                const clientRisk = invoice.clientId
                    ? riskMap.get(invoice.clientId) || 0.35
                    : 0.35;
                const reliability = clamp(
                    statusWeight * (1 - clientRisk * 0.5),
                    0.2,
                    0.95,
                );
                return sum + amount * reliability;
            }, 0);
    };

    const next30Days = Math.max(0, baseDaily30 * 30 + expectedCollections(30));
    const next90Days = Math.max(0, baseDaily90 * 90 + expectedCollections(90));

    const volatility = (() => {
        if (paidAmounts.length < 2) return 0.5;
        const mean =
            paidAmounts.reduce((a, b) => a + b, 0) / paidAmounts.length;
        if (mean <= 0) return 0.5;
        const variance =
            paidAmounts.reduce((acc, val) => acc + (val - mean) ** 2, 0) /
            paidAmounts.length;
        const std = Math.sqrt(variance);
        const coefficient = std / mean;
        return clamp(coefficient, 0, 1.5);
    })();

    const confidence = Number(
        (clamp(0.92 - volatility * 0.35, 0.45, 0.92) * 100).toFixed(1),
    );

    // --- Customer segmentation (RFM style) ---
    const byClient = new Map<
        string,
        {
            lastDate: Date | null;
            frequency: number;
            monetary: number;
        }
    >();

    const ensureClientStats = (clientId: string) => {
        if (!byClient.has(clientId)) {
            byClient.set(clientId, {
                lastDate: null,
                frequency: 0,
                monetary: 0,
            });
        }
        return byClient.get(clientId)!;
    };

    activeInvoices.forEach((invoice) => {
        if (!invoice.clientId) return;
        const stats = ensureClientStats(invoice.clientId);
        const issueDate =
            toDate(invoice.issueDate) || toDate(invoice.$createdAt) || now;
        stats.frequency += 1;
        stats.monetary += invoice.totalGross ?? 0;
        if (!stats.lastDate || issueDate > stats.lastDate) {
            stats.lastDate = issueDate;
        }
    });

    const recencies: number[] = [];
    const frequencies: number[] = [];
    const monetaryValues: number[] = [];

    const rawRfm = Array.from(byClient.entries()).map(([clientId, stats]) => {
        const recencyDays = stats.lastDate
            ? Math.max(
                  0,
                  Math.floor(
                      (nowStart.getTime() -
                          startOfDay(stats.lastDate).getTime()) /
                          DAY_MS,
                  ),
              )
            : 999;
        recencies.push(recencyDays);
        frequencies.push(stats.frequency);
        monetaryValues.push(stats.monetary);
        return {
            clientId,
            recencyDays,
            frequency: stats.frequency,
            monetary: stats.monetary,
        };
    });

    const recSorted = [...recencies].sort((a, b) => a - b);
    const freqSorted = [...frequencies].sort((a, b) => a - b);
    const monSorted = [...monetaryValues].sort((a, b) => a - b);

    const recQ20 = percentile(recSorted, 0.2);
    const recQ40 = percentile(recSorted, 0.4);
    const recQ60 = percentile(recSorted, 0.6);
    const recQ80 = percentile(recSorted, 0.8);

    const freqQ20 = percentile(freqSorted, 0.2);
    const freqQ40 = percentile(freqSorted, 0.4);
    const freqQ60 = percentile(freqSorted, 0.6);
    const freqQ80 = percentile(freqSorted, 0.8);

    const monQ20 = percentile(monSorted, 0.2);
    const monQ40 = percentile(monSorted, 0.4);
    const monQ60 = percentile(monSorted, 0.6);
    const monQ80 = percentile(monSorted, 0.8);

    const recencyScore = (value: number) => {
        if (value <= recQ20) return 5;
        if (value <= recQ40) return 4;
        if (value <= recQ60) return 3;
        if (value <= recQ80) return 2;
        return 1;
    };

    const regularScore = (
        value: number,
        q20: number,
        q40: number,
        q60: number,
        q80: number,
    ) => {
        if (value <= q20) return 1;
        if (value <= q40) return 2;
        if (value <= q60) return 3;
        if (value <= q80) return 4;
        return 5;
    };

    const customerSegments: CustomerSegment[] = rawRfm
        .map((entry) => {
            const r = recencyScore(entry.recencyDays);
            const f = regularScore(
                entry.frequency,
                freqQ20,
                freqQ40,
                freqQ60,
                freqQ80,
            );
            const m = regularScore(
                entry.monetary,
                monQ20,
                monQ40,
                monQ60,
                monQ80,
            );

            let segment: CustomerSegment["segment"] = "needs_attention";
            if (r >= 4 && f >= 4 && m >= 4) segment = "champions";
            else if (f >= 4 && m >= 3) segment = "loyal";
            else if (r <= 2 && (f >= 3 || m >= 3)) segment = "at_risk";
            else if (f <= 2 && r >= 4) segment = "new";

            return {
                clientId: entry.clientId,
                clientName:
                    clientNameMap.get(entry.clientId) || "Unknown client",
                recencyDays: entry.recencyDays,
                frequency: entry.frequency,
                monetary: Number(entry.monetary.toFixed(2)),
                segment,
            };
        })
        .sort((a, b) => b.monetary - a.monetary);

    // --- Anomaly detection ---
    const anomalies: AnalyticsAnomaly[] = [];

    const invoiceAmounts = activeInvoices.map(
        (invoice) => invoice.totalGross ?? 0,
    );
    const meanAmount =
        invoiceAmounts.length > 0
            ? invoiceAmounts.reduce((sum, value) => sum + value, 0) /
              invoiceAmounts.length
            : 0;
    const stdAmount =
        invoiceAmounts.length > 1
            ? Math.sqrt(
                  invoiceAmounts.reduce(
                      (sum, value) => sum + (value - meanAmount) ** 2,
                      0,
                  ) / invoiceAmounts.length,
              )
            : 0;

    if (stdAmount > 0) {
        activeInvoices.forEach((invoice) => {
            const amount = invoice.totalGross ?? 0;
            const zScore = (amount - meanAmount) / stdAmount;
            if (Math.abs(zScore) >= 2.5) {
                anomalies.push({
                    type: "amount_outlier",
                    severity: Math.abs(zScore) >= 3.5 ? "high" : "medium",
                    message: `Invoice ${invoice.invoiceNumber || invoice.$id} amount (${amount.toFixed(
                        2,
                    )}) is an outlier vs baseline.`,
                    invoiceId: invoice.$id,
                    clientId: invoice.clientId,
                });
            }
        });
    }

    const clientDropMap = new Map<
        string,
        { recent: number; previous: number }
    >();
    activeInvoices.forEach((invoice) => {
        if (!invoice.clientId) return;
        const issueDate =
            toDate(invoice.issueDate) || toDate(invoice.$createdAt);
        if (!issueDate) return;

        if (!clientDropMap.has(invoice.clientId)) {
            clientDropMap.set(invoice.clientId, { recent: 0, previous: 0 });
        }

        const daysAgo = Math.floor(
            (nowStart.getTime() - startOfDay(issueDate).getTime()) / DAY_MS,
        );
        const bucket = clientDropMap.get(invoice.clientId)!;
        if (daysAgo >= 0 && daysAgo <= 30) bucket.recent += 1;
        else if (daysAgo > 30 && daysAgo <= 60) bucket.previous += 1;
    });

    clientDropMap.forEach((value, clientId) => {
        if (value.previous >= 3 && value.recent === 0) {
            anomalies.push({
                type: "client_dropoff",
                severity: "high",
                message: `${clientNameMap.get(clientId) || "Client"} dropped from ${
                    value.previous
                } invoices to 0 in the last 30 days.`,
                clientId,
            });
        }
    });

    const duplicateMap = new Map<string, number>();
    activeInvoices.forEach((invoice) => {
        const issueDate =
            invoice.issueDate ||
            toDate(invoice.$createdAt)?.toISOString().slice(0, 10);
        const amount = (invoice.totalGross ?? 0).toFixed(2);
        const key = `${invoice.clientId || "unknown"}|${issueDate || "unknown"}|${amount}`;
        duplicateMap.set(key, (duplicateMap.get(key) || 0) + 1);
    });

    duplicateMap.forEach((count, key) => {
        if (count >= 3) {
            const [clientId] = key.split("|");
            anomalies.push({
                type: "duplicate_pattern",
                severity: count >= 5 ? "high" : "medium",
                message: `${count} invoices with identical amount/date pattern detected for ${
                    clientNameMap.get(clientId) || "a client"
                }.`,
                clientId,
            });
        }
    });

    // --- KPI intelligence ---
    const totalRevenue = paidInvoices.reduce(
        (sum, invoice) => sum + (invoice.totalGross ?? 0),
        0,
    );
    const revenueByClient = new Map<string, number>();
    paidInvoices.forEach((invoice) => {
        if (!invoice.clientId) return;
        revenueByClient.set(
            invoice.clientId,
            (revenueByClient.get(invoice.clientId) || 0) +
                (invoice.totalGross ?? 0),
        );
    });

    const topClients = Array.from(revenueByClient.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);

    const topShare =
        totalRevenue > 0
            ? (topClients.reduce((sum, [, revenue]) => sum + revenue, 0) /
                  totalRevenue) *
              100
            : 0;

    const paymentDays: number[] = paidInvoices
        .map((invoice) => {
            const issueDate = toDate(invoice.issueDate);
            const paidDate = toDate(invoice.$updatedAt);
            if (!issueDate || !paidDate) return null;
            return Math.max(
                0,
                Math.floor(
                    (startOfDay(paidDate).getTime() -
                        startOfDay(issueDate).getTime()) /
                        DAY_MS,
                ),
            );
        })
        .filter((value): value is number => value !== null);

    const averagePaymentDays =
        paymentDays.length > 0
            ? paymentDays.reduce((sum, days) => sum + days, 0) /
              paymentDays.length
            : 0;

    const overdueOpen = openInvoices.filter((invoice) => {
        const dueDate = toDate(invoice.dueDate);
        return dueDate
            ? startOfDay(dueDate).getTime() < nowStart.getTime()
            : false;
    });

    const overdueAmount = overdueOpen.reduce(
        (sum, invoice) => sum + (invoice.totalGross ?? 0),
        0,
    );
    const paidRate =
        activeInvoices.length > 0
            ? (paidInvoices.length / activeInvoices.length) * 100
            : 0;

    const kpiInsights: KPIInsight[] = [
        {
            key: "top_client_concentration",
            value: `Top 3 clients drive ${topShare.toFixed(1)}% of paid revenue.`,
            importance:
                topShare >= 60 ? "high" : topShare >= 40 ? "medium" : "low",
        },
        {
            key: "payment_cycle",
            value: `Average payment cycle is ${averagePaymentDays.toFixed(1)} days.`,
            importance:
                averagePaymentDays > 35
                    ? "high"
                    : averagePaymentDays > 21
                      ? "medium"
                      : "low",
        },
        {
            key: "overdue_exposure",
            value: `${overdueOpen.length} overdue open invoices totaling ${overdueAmount.toFixed(2)} €.`,
            importance:
                overdueAmount > 10000
                    ? "high"
                    : overdueAmount > 3000
                      ? "medium"
                      : "low",
        },
        {
            key: "collection_efficiency",
            value: `Collection efficiency (paid/all active) is ${paidRate.toFixed(1)}%.`,
            importance:
                paidRate < 45 ? "high" : paidRate < 65 ? "medium" : "low",
        },
    ];

    return {
        forecast: {
            next30Days: Number(next30Days.toFixed(2)),
            next90Days: Number(next90Days.toFixed(2)),
            confidence,
        },
        latePaymentRisk: latePaymentRisk.slice(0, 10),
        customerSegments,
        anomalies: anomalies.slice(0, 12),
        kpiInsights,
        generatedAt: new Date().toISOString(),
    };
}
