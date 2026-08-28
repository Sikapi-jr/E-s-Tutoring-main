# Seeds an initial list of well-known schools (English, French, and French
# Immersion; elementary and high school) across the GTA/Durham Region cities
# this tutoring business primarily serves. All rows start with
# gives_credits=False / credit_hours=0 - nothing is credit-enabled until an
# admin turns it on via the School management page.
#
# NOTE: this list was compiled from general knowledge of Ontario school
# boards and well-known school names, not verified against a live source.
# Review/correct/expand it in the admin School management UI as needed -
# that's just editing DB rows, no redeploy required.

from django.db import migrations

SCHOOLS = [
    # --- Toronto: TDSB (English public) ---
    {"name": "Agincourt Collegiate Institute", "city": "Toronto", "school_type": "high", "language_stream": "english", "board_name": "TDSB"},
    {"name": "Blythwood Junior Public School", "city": "Toronto", "school_type": "elementary", "language_stream": "english", "board_name": "TDSB"},
    {"name": "Earl Haig Secondary School", "city": "Toronto", "school_type": "high", "language_stream": "english", "board_name": "TDSB"},
    {"name": "Lawrence Park Collegiate Institute", "city": "Toronto", "school_type": "high", "language_stream": "english", "board_name": "TDSB"},
    {"name": "Marc Garneau Collegiate Institute", "city": "Toronto", "school_type": "high", "language_stream": "english", "board_name": "TDSB"},
    {"name": "Northern Secondary School", "city": "Toronto", "school_type": "high", "language_stream": "english", "board_name": "TDSB"},
    {"name": "Withrow Avenue Junior Public School", "city": "Toronto", "school_type": "elementary", "language_stream": "english", "board_name": "TDSB"},
    # --- Toronto: TCDSB (English Catholic) ---
    {"name": "Neil McNeil High School", "city": "Toronto", "school_type": "high", "language_stream": "english", "board_name": "TCDSB"},
    {"name": "Notre Dame Catholic High School", "city": "Toronto", "school_type": "high", "language_stream": "english", "board_name": "TCDSB"},
    # --- Toronto: French / French Immersion ---
    {"name": "École élémentaire Charles-Sauriol", "city": "Toronto", "school_type": "elementary", "language_stream": "french", "board_name": "Conseil scolaire Viamonde"},
    {"name": "École secondaire Toronto Ouest", "city": "Toronto", "school_type": "high", "language_stream": "french", "board_name": "Conseil scolaire Viamonde"},
    {"name": "Toronto French School", "city": "Toronto", "school_type": "other", "language_stream": "french_immersion", "board_name": "Independent"},

    # --- Ajax: Durham DSB / Durham Catholic DSB ---
    {"name": "Ajax High School", "city": "Ajax", "school_type": "high", "language_stream": "english", "board_name": "Durham DSB"},
    {"name": "J. Clarke Richardson Collegiate", "city": "Ajax", "school_type": "high", "language_stream": "english", "board_name": "Durham DSB"},
    {"name": "St. Francis of Assisi Catholic School", "city": "Ajax", "school_type": "elementary", "language_stream": "english", "board_name": "Durham Catholic DSB"},

    # --- Whitby ---
    {"name": "All Saints Catholic Secondary School", "city": "Whitby", "school_type": "high", "language_stream": "english", "board_name": "Durham Catholic DSB"},
    {"name": "Anderson Collegiate and Vocational Institute", "city": "Whitby", "school_type": "high", "language_stream": "english", "board_name": "Durham DSB"},
    {"name": "Whitby High School", "city": "Whitby", "school_type": "high", "language_stream": "english", "board_name": "Durham DSB"},

    # --- Oshawa ---
    {"name": "Eastdale Collegiate and Vocational Institute", "city": "Oshawa", "school_type": "high", "language_stream": "english", "board_name": "Durham DSB"},
    {"name": "École secondaire l'Héritage", "city": "Oshawa", "school_type": "high", "language_stream": "french", "board_name": "Conseil scolaire Viamonde"},
    {"name": "Msgr. John Pereyma Catholic Secondary School", "city": "Oshawa", "school_type": "high", "language_stream": "english", "board_name": "Durham Catholic DSB"},
    {"name": "O'Neill Collegiate and Vocational Institute", "city": "Oshawa", "school_type": "high", "language_stream": "english", "board_name": "Durham DSB"},
    {"name": "Oshawa Central Collegiate Institute", "city": "Oshawa", "school_type": "high", "language_stream": "english", "board_name": "Durham DSB"},

    # --- Bowmanville / Clarington ---
    {"name": "Bowmanville High School", "city": "Clarington", "school_type": "high", "language_stream": "english", "board_name": "Durham DSB"},
    {"name": "Clarington Central Secondary School", "city": "Clarington", "school_type": "high", "language_stream": "english", "board_name": "Durham DSB"},
    {"name": "St. Stephen's Catholic Secondary School", "city": "Clarington", "school_type": "high", "language_stream": "english", "board_name": "Durham Catholic DSB"},

    # --- Pickering ---
    {"name": "Dunbarton High School", "city": "Pickering", "school_type": "high", "language_stream": "english", "board_name": "Durham DSB"},
    {"name": "Notre Dame Catholic Secondary School", "city": "Pickering", "school_type": "high", "language_stream": "english", "board_name": "Durham Catholic DSB"},
    {"name": "Pickering High School", "city": "Pickering", "school_type": "high", "language_stream": "english", "board_name": "Durham DSB"},

    # --- Markham: York Region DSB / York Catholic DSB ---
    {"name": "École secondaire catholique Saint-Frère-André", "city": "Markham", "school_type": "high", "language_stream": "french", "board_name": "Conseil scolaire MonAvenir"},
    {"name": "Markham District High School", "city": "Markham", "school_type": "high", "language_stream": "english", "board_name": "York Region DSB"},
    {"name": "Milliken Mills High School", "city": "Markham", "school_type": "high", "language_stream": "english", "board_name": "York Region DSB"},
    {"name": "St. Brother André Catholic High School", "city": "Markham", "school_type": "high", "language_stream": "english", "board_name": "York Catholic DSB"},
    {"name": "Unionville High School", "city": "Markham", "school_type": "high", "language_stream": "english", "board_name": "York Region DSB"},
]


def seed_schools(apps, schema_editor):
    School = apps.get_model('playground', 'School')
    for entry in SCHOOLS:
        School.objects.get_or_create(
            name=entry["name"],
            defaults={
                "city": entry.get("city", ""),
                "school_type": entry.get("school_type", ""),
                "language_stream": entry.get("language_stream", ""),
                "board_name": entry.get("board_name", ""),
                "gives_credits": False,
                "credit_hours": 0,
                "is_active": True,
            },
        )


def remove_seeded_schools(apps, schema_editor):
    # Only remove the exact rows this migration seeded, by name - never a
    # blanket delete, so anything an admin has added/edited since is safe.
    School = apps.get_model('playground', 'School')
    names = [entry["name"] for entry in SCHOOLS]
    School.objects.filter(name__in=names).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('playground', '0048_school_studentschoolcredit_credit_fields'),
    ]

    operations = [
        migrations.RunPython(seed_schools, remove_seeded_schools),
    ]
