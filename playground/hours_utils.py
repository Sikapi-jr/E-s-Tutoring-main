"""Shared business logic for creating Hours rows against a student's
school-credit balance.

Used by both LogHoursCreateView (tutor logging) and AdminBatchAddHoursView
(admin batch-add), so the credit-consuming/splitting behaviour stays
identical for both paths.
"""
from decimal import Decimal

from django.db import transaction

from .models import Hours, User


@transaction.atomic
def create_hours_with_credit_split(
    *, student_id, parent_id, tutor_id, date, start_time, end_time, total_time,
    location, subject, notes, status='Accepted', eligible='Eligible', invoice_status='pending'
):
    """Atomically consumes the student's remaining credit_balance and creates
    one or two Hours rows.

    - If the student has no credit balance: one 'normal' row for the full amount.
    - If the balance fully covers the session: one 'credited' row for the full
      amount, balance decremented accordingly.
    - If the balance only partially covers the session: two rows - a
      'credited' row for the remaining balance, and a 'normal' row for the
      remainder - and the balance is zeroed out.

    Must be called from within (or as) a transaction - the @transaction.atomic
    here covers callers that aren't already inside one; nesting an atomic
    block inside an existing one is safe (it becomes a savepoint).

    Returns a list of the created Hours instances (length 1 or 2).
    """
    total_time = Decimal(str(total_time))

    # Lock the student row for the duration of this transaction so two
    # concurrent hour-logs against the same shrinking balance can't both
    # read the same "remaining" value and double-spend it.
    student = User.objects.select_for_update().get(pk=student_id)
    remaining = student.credit_balance or Decimal('0')

    common = dict(
        student_id=student_id, parent_id=parent_id, tutor_id=tutor_id,
        date=date, startTime=start_time, endTime=end_time,
        location=location, subject=subject, notes=notes,
        status=status, eligible=eligible, invoice_status=invoice_status,
    )

    created = []

    if remaining <= 0:
        created.append(Hours.objects.create(**common, totalTime=total_time, billing_status='normal'))
        return created

    if total_time <= remaining:
        # Fully covered by remaining credit
        created.append(Hours.objects.create(**common, totalTime=total_time, billing_status='credited'))
        student.credit_balance = remaining - total_time
        student.save(update_fields=['credit_balance'])
        return created

    # Partial coverage: split into a credited row (rest of balance) and a
    # normal row (the remainder, billed as usual).
    credited_amount = remaining
    normal_amount = total_time - remaining
    created.append(Hours.objects.create(**common, totalTime=credited_amount, billing_status='credited'))
    created.append(Hours.objects.create(**common, totalTime=normal_amount, billing_status='normal'))
    student.credit_balance = Decimal('0')
    student.save(update_fields=['credit_balance'])
    return created
