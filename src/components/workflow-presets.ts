import type { Edge, Node } from "@xyflow/react";
import type { BlockIconName, BlockTone } from "@/components/TriggerMenu";
import type { BlockData } from "@/components/WorkflowNode";

export type TemplateFamily = "paid" | "customers" | "team" | "data";

export const TEMPLATE_FAMILIES: Array<{ id: TemplateFamily; label: string }> = [
  { id: "paid", label: "Get paid faster" },
  { id: "customers", label: "Keep your customers" },
  { id: "team", label: "Keep your team informed" },
  { id: "data", label: "Keep your data clean" },
];

export type WorkflowPreset = {
  id: string;
  family: TemplateFamily;
  label: string;
  icon: string;
  tint: string;
  prompt: string;
  name: string;
  description: string;
  card: string;
  lines: string[];
  nodes: Node<BlockData, "block">[];
  edges: Edge[];
};

function chain(
  id: string,
  steps: Array<{
    title: string;
    summary: string;
    icon: BlockIconName;
    tone: BlockTone;
    trigger?: boolean;
  }>,
) {
  const nodes: Node<BlockData, "block">[] = steps.map((step, index) => ({
    id: `${id}-${index}`,
    type: "block",
    position: { x: index * 320, y: index > 0 && steps[0]?.trigger ? 20 : 0 },
    data: {
      title: step.title,
      summary: step.summary,
      trigger: step.trigger,
      status: "ok",
      icon: step.icon,
      tone: step.tone,
    },
  }));
  const edges: Edge[] = steps.slice(1).map((_, index) => ({
    id: `e-${id}-${index}`,
    source: `${id}-${index}`,
    target: `${id}-${index + 1}`,
    type: "flow",
  }));
  return { nodes, edges };
}

export const WORKFLOW_PRESETS: WorkflowPreset[] = [
  {
    id: "overdue",
    family: "paid",
    label: "Overdue invoice reminders",
    icon: "/shell/clock.svg",
    tint: "var(--yellow-bg-3)",
    name: "Overdue invoice reminders",
    description: "Remind customers when an invoice is late",
    card: "Remind customers about late invoices, then alert your team.",
    prompt:
      "Every weekday at 9:00, find invoices that are past due and email each customer a reminder. If the invoice is still unpaid after 3 days, send a second reminder.",
    lines: [
      "Starting from invoices that slipped past their due date.",
      "I'll check every weekday at 9:00 and keep only the unpaid ones.",
      "Each customer gets a reminder, then a second one three days later.",
      "The workflow is ready.",
    ],
    ...chain("overdue", [
      { title: "Invoice overdue", summary: "Past the due date", icon: "hourglass", tone: "yellow", trigger: true },
      { title: "Find records", summary: "Unpaid invoices", icon: "magnifying-glass", tone: "orange" },
      { title: "Filter", summary: "Still past due", icon: "funnel", tone: "purple" },
      { title: "Email your team", summary: "First reminder", icon: "envelope", tone: "pink" },
      { title: "Delay", summary: "Wait 3 days", icon: "clock", tone: "yellow" },
      { title: "Email your team", summary: "Second reminder", icon: "envelope", tone: "pink" },
    ]),
  },
  {
    id: "renewal",
    family: "customers",
    label: "Upcoming renewal",
    icon: "/shell/call-bell.svg",
    tint: "var(--purple-bg-3)",
    name: "Upcoming renewal",
    description: "Remind customers before a subscription renews",
    card: "Email customers a week before renewal, and ask for approval on large invoices.",
    prompt:
      "One week before a subscription renews, email the customer the amount and the renewal date. If the invoice is over €5,000, ask for approval first.",
    lines: [
      "Looking at subscriptions that renew in the next seven days.",
      "Invoices over €5,000 go through approval before anything is sent.",
      "Everyone else gets an email with the amount and the renewal date.",
      "The workflow is ready.",
    ],
    ...chain("renewal", [
      { title: "Renewal coming up", summary: "Within 7 days", icon: "calendar-blank", tone: "purple", trigger: true },
      { title: "Find records", summary: "Renewing subscriptions", icon: "magnifying-glass", tone: "orange" },
      { title: "Request approval", summary: "Above €5,000", icon: "checks", tone: "purple" },
      { title: "Email your team", summary: "Renewal reminder", icon: "envelope", tone: "pink" },
    ]),
  },
  {
    id: "recovery",
    family: "paid",
    label: "Failed payment recovery",
    icon: "/shell/wallet.svg",
    tint: "var(--turquoise-bg-3)",
    name: "Failed payment recovery",
    description: "Retry a failed payment, then pause the subscription",
    card: "Ask for a new card after a failed payment, then pause the subscription.",
    prompt:
      "When a payment fails, wait one day, then email the customer to update their card. If the retry fails too, pause the subscription.",
    lines: [
      "This starts when a card payment fails.",
      "We wait a day, then ask the customer to update their card.",
      "If the retry fails, the subscription is paused.",
      "The workflow is ready.",
    ],
    ...chain("recovery", [
      { title: "Payment failed", summary: "Card was declined", icon: "hourglass", tone: "turquoise", trigger: true },
      { title: "Delay", summary: "Wait 1 day", icon: "clock", tone: "yellow" },
      { title: "Email your team", summary: "Ask to update the card", icon: "envelope", tone: "pink" },
      { title: "Wait for event", summary: "Retry the payment", icon: "hourglass", tone: "turquoise" },
      { title: "Update subscription", summary: "Pause if it fails", icon: "arrows-clockwise", tone: "turquoise" },
    ]),
  },
  {
    id: "quote",
    family: "paid",
    label: "Unsigned quote reminder",
    icon: "/shell/file-text.svg",
    tint: "var(--orange-bg-3)",
    name: "Unsigned quote reminder",
    description: "Nudge a quote that has not been signed",
    card: "If a quote sits unsigned, wait three days, then email the customer.",
    prompt:
      "When a quote is sent and still unsigned after 3 days, email the customer a reminder with the quote link.",
    lines: [
      "This starts from quotes that were sent and never signed.",
      "We wait three days before sending anything.",
      "The customer gets one reminder with the quote.",
      "The workflow is ready.",
    ],
    ...chain("quote", [
      { title: "Quote sent", summary: "Still unsigned", icon: "hourglass", tone: "orange", trigger: true },
      { title: "Delay", summary: "Wait 3 days", icon: "clock", tone: "yellow" },
      { title: "Filter", summary: "Still unsigned", icon: "funnel", tone: "purple" },
      { title: "Email your team", summary: "Reminder to the customer", icon: "envelope", tone: "pink" },
    ]),
  },
  {
    id: "welcome",
    family: "customers",
    label: "Subscription welcome",
    icon: "/shell/users-three.svg",
    tint: "var(--pink-bg-3)",
    name: "Subscription welcome",
    description: "Confirm what the customer just subscribed to",
    card: "When a subscription starts, email the customer what they just bought.",
    prompt:
      "When a subscription starts, email the customer a summary of the products, the price, and the next invoice date.",
    lines: [
      "This starts as soon as a subscription is created.",
      "We pull the products and the next invoice date.",
      "The customer gets a welcome email.",
      "The workflow is ready.",
    ],
    ...chain("welcome", [
      { title: "Subscription started", summary: "A new subscription", icon: "arrows-clockwise", tone: "turquoise", trigger: true },
      { title: "Get record", summary: "Products and price", icon: "database", tone: "orange" },
      { title: "Email your team", summary: "Welcome email", icon: "envelope", tone: "pink" },
    ]),
  },
  {
    id: "trial",
    family: "customers",
    label: "Trial ending",
    icon: "/block-icons/calendar-blank.svg",
    tint: "var(--yellow-bg-3)",
    name: "Trial ending",
    description: "Warn before a trial ends, then pause it",
    card: "Three days before a trial ends, email the customer and pause it if they do not convert.",
    prompt:
      "Three days before a trial ends, email the customer. If they have not added a payment method when the trial ends, pause the subscription.",
    lines: [
      "Looking at trials that end in the next three days.",
      "The customer gets an email before the trial ends.",
      "If there is still no payment method, the subscription is paused.",
      "The workflow is ready.",
    ],
    ...chain("trial", [
      { title: "Trial ending", summary: "Within 3 days", icon: "calendar-blank", tone: "yellow", trigger: true },
      { title: "Email your team", summary: "Trial reminder", icon: "envelope", tone: "pink" },
      { title: "Filter", summary: "No payment method", icon: "funnel", tone: "purple" },
      { title: "Update subscription", summary: "Pause the trial", icon: "arrows-clockwise", tone: "turquoise" },
    ]),
  },
  {
    id: "paid",
    family: "team",
    label: "Invoice paid",
    icon: "/block-icons/checks.svg",
    tint: "var(--turquoise-bg-3)",
    name: "Invoice paid",
    description: "Thank the customer when an invoice is paid",
    card: "When an invoice is paid, thank the customer and tell the account team.",
    prompt:
      "When an invoice is paid, email the customer a receipt and email the account owner that the invoice is settled.",
    lines: [
      "This starts when an invoice is marked paid.",
      "The customer receives a receipt.",
      "The account team gets a short note.",
      "The workflow is ready.",
    ],
    ...chain("paid", [
      { title: "Invoice paid", summary: "Payment received", icon: "checks", tone: "turquoise", trigger: true },
      { title: "Email your team", summary: "Receipt to the customer", icon: "envelope", tone: "pink" },
      { title: "Email your team", summary: "Note to the owner", icon: "envelope", tone: "pink" },
    ]),
  },
  {
    id: "usage",
    family: "customers",
    label: "Usage threshold",
    icon: "/shell/chart-line.svg",
    tint: "var(--orange-bg-3)",
    name: "Usage threshold",
    description: "Alert when usage crosses a limit",
    card: "When usage crosses a threshold, email the customer and flag the account.",
    prompt:
      "When a customer's usage goes over 80% of their included amount, email them and email the account team.",
    lines: [
      "Watching usage that crosses 80% of the included amount.",
      "The customer gets an email about the threshold.",
      "The account team is flagged on the same run.",
      "The workflow is ready.",
    ],
    ...chain("usage", [
      { title: "Usage crossed", summary: "Over 80% included", icon: "hourglass", tone: "orange", trigger: true },
      { title: "Filter", summary: "Still over the limit", icon: "funnel", tone: "purple" },
      { title: "Email your team", summary: "Email the customer", icon: "envelope", tone: "pink" },
      { title: "Email your team", summary: "Flag the account", icon: "envelope", tone: "pink" },
    ]),
  },
  {
    id: "approval",
    family: "paid",
    label: "Large invoice approval",
    icon: "/shell/notepad.svg",
    tint: "var(--purple-bg-3)",
    name: "Large invoice approval",
    description: "Ask for approval before a large invoice is sent",
    card: "Hold invoices over €10,000 until someone on the team approves them.",
    prompt:
      "When an invoice over €10,000 is ready, ask for approval before it is sent. Email the customer only after it is approved.",
    lines: [
      "This starts when a draft invoice is over €10,000.",
      "Someone on the team has to approve it.",
      "The customer is emailed only after approval.",
      "The workflow is ready.",
    ],
    ...chain("approval", [
      { title: "Invoice drafted", summary: "Over €10,000", icon: "hourglass", tone: "purple", trigger: true },
      { title: "Filter", summary: "Amount over €10,000", icon: "funnel", tone: "purple" },
      { title: "Request approval", summary: "Finance review", icon: "checks", tone: "purple" },
      { title: "Email your team", summary: "Send the invoice", icon: "envelope", tone: "pink" },
    ]),
  },
  {
    id: "cancel",
    family: "data",
    label: "Subscription canceled",
    icon: "/shell/arrows-clockwise.svg",
    tint: "var(--grey-bg-3)",
    name: "Subscription canceled",
    description: "Tell the team when a customer cancels",
    card: "When a subscription is canceled, email the team and save the reason.",
    prompt:
      "When a subscription is canceled, email the account team and save the cancellation reason on the customer.",
    lines: [
      "This starts when a subscription is canceled.",
      "The reason is saved on the customer.",
      "The account team gets an email.",
      "The workflow is ready.",
    ],
    ...chain("cancel", [
      { title: "Subscription canceled", summary: "Customer canceled", icon: "stop-circle", tone: "grey", trigger: true },
      { title: "Update customer", summary: "Save the reason", icon: "pencil-simple", tone: "orange" },
      { title: "Email your team", summary: "Tell the account team", icon: "envelope", tone: "pink" },
    ]),
  },
];
