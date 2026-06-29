import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import {
  jsonError,
  requireSchedulerId,
} from "@/components/calendar-admin/require-scheduler";
import {
  createSequenceStep,
  getSequence,
  listSequenceSteps,
  replaceSequenceSteps,
  SequenceValidationError,
  type CreateStepInput,
} from "@/lib/email/sequences";
import { getDb } from "@/lib/db/client";
import { calendars } from "@/lib/db/schema";
import type { SequenceStepAction } from "@/lib/types/platform";

type RouteParams = { params: Promise<{ id: string; sequenceId: string }> };

type ReplaceStepsBody = { steps: CreateStepInput[] };

async function getOwnedCalendar(calendarId: string, schedulerId: string) {
  const [calendar] = await getDb()
    .select()
    .from(calendars)
    .where(
      and(
        eq(calendars.id, calendarId),
        eq(calendars.schedulerId, schedulerId),
      ),
    )
    .limit(1);
  return calendar ?? null;
}

function validateStepInput(step: CreateStepInput): string | null {
  if (step.order == null || step.order < 1) {
    return "order must be a positive integer";
  }
  if (!["after_booking", "before_meeting", "after_meeting"].includes(
    step.timingAnchor ?? "after_booking",
  )) {
    return "timingAnchor must be after_booking, before_meeting, or after_meeting";
  }
  if (step.delayMinutes == null || step.delayMinutes < 0) {
    return "delayMinutes must be non-negative";
  }
  if (!["send_email", "webhook", "both"].includes(step.action)) {
    return "action must be send_email, webhook, or both";
  }
  if (
    (step.action === "send_email" || step.action === "both") &&
    !step.subjectTemplate
  ) {
    return "subjectTemplate is required for send_email steps";
  }
  return null;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const auth = await requireSchedulerId();
  if (auth instanceof NextResponse) {
    return auth;
  }

  const { id: calendarId, sequenceId } = await params;
  const calendar = await getOwnedCalendar(calendarId, auth.schedulerId);
  if (!calendar) {
    return jsonError("Calendar not found", 404);
  }

  const steps = await listSequenceSteps(calendarId, sequenceId);
  if (!steps) {
    return jsonError("Sequence not found", 404);
  }

  return NextResponse.json({ steps });
}

export async function POST(request: Request, { params }: RouteParams) {
  const auth = await requireSchedulerId();
  if (auth instanceof NextResponse) {
    return auth;
  }

  const { id: calendarId, sequenceId } = await params;
  const calendar = await getOwnedCalendar(calendarId, auth.schedulerId);
  if (!calendar) {
    return jsonError("Calendar not found", 404);
  }

  let body: CreateStepInput;
  try {
    body = (await request.json()) as CreateStepInput;
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const validationError = validateStepInput({
    ...body,
    action: body.action as SequenceStepAction,
  });
  if (validationError) {
    return jsonError(validationError, 400);
  }

  const step = await createSequenceStep(calendarId, sequenceId, body);
  if (!step) {
    return jsonError("Sequence not found", 404);
  }

  return NextResponse.json({ step }, { status: 201 });
}

export async function PUT(request: Request, { params }: RouteParams) {
  const auth = await requireSchedulerId();
  if (auth instanceof NextResponse) {
    return auth;
  }

  const { id: calendarId, sequenceId } = await params;
  const calendar = await getOwnedCalendar(calendarId, auth.schedulerId);
  if (!calendar) {
    return jsonError("Calendar not found", 404);
  }

  let body: ReplaceStepsBody;
  try {
    body = (await request.json()) as ReplaceStepsBody;
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  if (!Array.isArray(body.steps)) {
    return jsonError("steps must be an array", 400);
  }

  // BUG-052: verify sequence ownership before validating step bodies, so an
  // unknown/foreign sequence returns 404 instead of 400.
  const sequence = await getSequence(calendarId, sequenceId);
  if (!sequence) {
    return jsonError("Sequence not found", 404);
  }

  for (const step of body.steps) {
    const validationError = validateStepInput(step);
    if (validationError) {
      return jsonError(validationError, 400);
    }
  }

  let steps: Awaited<ReturnType<typeof replaceSequenceSteps>>;
  try {
    steps = await replaceSequenceSteps(calendarId, sequenceId, body.steps);
  } catch (error) {
    if (error instanceof SequenceValidationError) {
      return jsonError(error.message, 400);
    }
    throw error;
  }
  if (!steps) {
    return jsonError("Sequence not found", 404);
  }

  return NextResponse.json({ steps });
}
