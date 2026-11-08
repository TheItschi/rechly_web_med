"use client";
import { Button, Card, Col, Empty, Row, Select, Space, Tag, Typography } from "antd";
import type { BusinessProject, BusinessTask } from "@/lib/workspace/domain";
import { localDay, useWords } from "./common";
export default function TaskBoard({ tasks, projects, busy, edit, change }: { tasks: BusinessTask[]; projects: BusinessProject[]; busy: boolean; edit: (task: BusinessTask) => void; change: (task: BusinessTask, status: BusinessTask["status"]) => Promise<void> }) {
    const { l } = useWords();
    const statuses = [{ value: "todo", label: l("Offen", "To do") }, { value: "doing", label: l("In Arbeit", "In progress") }, { value: "done", label: l("Erledigt", "Done") }];
    return <Row gutter={[16,16]}>{statuses.map(status => <Col key={status.value} xs={24} lg={8}><Card size="small" title={`${status.label} (${tasks.filter(t => t.status === status.value).length})`}>
        <Space orientation="vertical" style={{ width: "100%" }}>{tasks.filter(t => t.status === status.value).map(task => <Card size="small" key={task.id}>
            <Typography.Title level={5} style={{ overflowWrap: "anywhere" }}>{task.title}</Typography.Title>
            <Typography.Paragraph type="secondary">{projects.find(p => p.id === task.project_id)?.name}{task.assignee && ` · ${task.assignee}`}</Typography.Paragraph>
            <Space wrap>{task.priority === "high" && <Tag color="orange">{l("Hohe Priorität", "High priority")}</Tag>}{task.due_date && <Tag color={task.status !== "done" && task.due_date < localDay() ? "red" : undefined}>{task.due_date}</Tag>}</Space>
            <Space wrap style={{ marginTop: 12 }}><Button disabled={busy} onClick={() => edit(task)}>{l("Öffnen", "Open")}</Button><Select aria-label={`${l("Status", "Status")}: ${task.title}`} disabled={busy} value={task.status} options={statuses} onChange={value => change(task, value)} style={{ minWidth: 120 }} /></Space>
        </Card>)}{!tasks.some(t => t.status === status.value) && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={l("Keine Aufgaben", "No tasks")} />}</Space>
    </Card></Col>)}</Row>;
}
