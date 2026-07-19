"""在留資格 (status of residence) / 活動制限 (activity restriction) code tables.

Provisional lookup tables built from the codes/labels referenced in the
detail design doc (resume-maker-zairyu-detail-design-v1.0.md sections 3.1 and
4.1). The design doc does not include the full official immigration-bureau
code table, so this list covers the common statuses it names explicitly plus
a few standard ones; extend as the authoritative list is confirmed with
legal/ops. Unknown codes fall back to the raw code string rather than
raising, so a not-yet-mapped code doesn't hard-fail the request.
"""

STATUS_OF_RESIDENCE: dict[str, str] = {
    "10": "技術・人文知識・国際業務",
    "20": "永住者",
    "30": "定住者",
    "40": "技能実習",
    "50": "留学",
    "60": "家族滞在",
    "70": "特定技能",
    "80": "永住者の配偶者等",
}

ACTIVITY_RESTRICTION: dict[str, str] = {
    "01": "制限なし",
    "02": "指定機関内で就労可",
    "03": "就労不可",
}


def status_of_residence_label(code: str) -> str:
    return STATUS_OF_RESIDENCE.get(code, code)


def activity_restriction_label(code: str) -> str:
    return ACTIVITY_RESTRICTION.get(code, code)
