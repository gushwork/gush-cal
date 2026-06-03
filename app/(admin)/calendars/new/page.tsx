import { pageTitle } from "@/lib/brand/metadata";
import { CalendarForm } from "@/components/calendar-admin/calendar-form";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { PageContainer } from "@/components/layout/page-container";
import { Card, PageHeader } from "@/components/ui";

export const metadata = pageTitle("New calendar");

export default function NewCalendarPage() {
  return (
    <PageContainer variant="narrow">
      <Breadcrumbs
        items={[
          { label: "Calendars", href: "/calendars" },
          { label: "New calendar" },
        ]}
      />
      <PageHeader
        title="New Calendar"
        subtitle="Set timezone, default working hours, booking rules, and meeting durations."
      />
      <Card>
        <CalendarForm mode="create" />
      </Card>
    </PageContainer>
  );
}
