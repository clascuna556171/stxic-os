import { CircleDollarSign, Clock, Flame, ListTodo, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";

const WIDGETS = [
  {
    title: "Today's tasks",
    description: "Your P0–P2 queue lands here once the Core agent ships.",
    icon: ListTodo,
    span: "md:col-span-2",
  },
  {
    title: "Focus",
    description: "Pomodoro timer and weekly stat.",
    icon: Flame,
    span: "",
  },
  {
    title: "World clocks",
    description: "Live timezone cards.",
    icon: Clock,
    span: "",
  },
  {
    title: "Income",
    description: "Multi-currency totals and chart.",
    icon: CircleDollarSign,
    span: "",
  },
  {
    title: "FX converter",
    description: "USD → PHP at the ECB rate (1h cache).",
    icon: Wallet,
    span: "md:col-span-2",
  },
];

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h2 className="text-foreground text-xl font-semibold tracking-tight">Welcome to Stxic</h2>
        <p className="text-muted text-sm">Your private life OS. Core features are shipping next.</p>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {WIDGETS.map((w) => (
          <Card key={w.title} className={w.span}>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>{w.title}</CardTitle>
              <Badge variant="muted">
                <w.icon className="size-3.5" />
              </Badge>
            </CardHeader>
            <CardContent>
              <EmptyState
                icon={<w.icon />}
                title="Not connected yet"
                description={w.description}
                className="py-8"
              />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
