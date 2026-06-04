import { pageTitle } from "@/lib/brand/metadata";
import { CalendarForm } from "@/components/calendar-admin/calendar-form";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { PageContainer } from "@/components/layout/page-container";
import { Card, PageHeader } from "@/components/ui";

export const metadata = pageTitle("New Calendar");

export default function NewCalendarPage() {
  return (
    <PageContainer variant="default">
      <Breadcrumbs
        items={[
          { label: "Calendars", href: "/calendars" },
          { label: "New Calendar" },
        ]}
      />
      <PageHeader
        title="New Calendar"
        subtitle="Set timezone, default working hours, booking rules, and meeting durations."
      />
      <section>
        <h2 className="text-heading font-semibold text-ink">Calendar Settings</h2>
        <Card className="mt-4">
          <CalendarForm mode="create" />
        </Card>
      </section>
    </PageContainer>
  );
}
