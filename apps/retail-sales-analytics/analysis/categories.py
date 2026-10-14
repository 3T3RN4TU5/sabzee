"""Rule-based product categorisation.

The source data has no product hierarchy, only free-text descriptions such as
"WHITE HANGING HEART T-LIGHT HOLDER". Categories are assigned by ordered keyword
rules: the first rule whose keyword appears as a whole word wins, so more
specific intents (seasonal, lighting) are listed before generic ones (décor).
Coverage is monitored by a data-quality check on the revenue share of "Other".
"""

from __future__ import annotations

import re

CATEGORY_RULES: list[tuple[str, list[str]]] = [
    (
        "Seasonal & Christmas",
        ["CHRISTMAS", "XMAS", "ADVENT", "EASTER", "SANTA", "REINDEER", "SNOWFLAKE",
         "NOEL", "HALLOWEEN", "BAUBLE", "BAUBLES", "NATIVITY", "SNOWMAN", "VALENTINE"],
    ),
    (
        "Candles & Lighting",
        ["T-LIGHT", "T-LIGHTS", "TLIGHT", "TEALIGHT", "CANDLE", "CANDLES", "LANTERN",
         "LIGHTS", "LIGHT", "LAMP", "CHANDELIER", "LAMPSHADE", "INCENSE", "OIL BURNER"],
    ),
    (
        "Party & Gift Wrap",
        ["PARTY", "GIFT", "WRAP", "CARD", "CARDS", "BIRTHDAY", "RIBBON", "RIBBONS",
         "BALLOON", "BALLOONS", "BUNTING", "CONFETTI", "GARLAND", "PAPER CHAIN", "TISSUE"],
    ),
    (
        "Bags & Storage",
        ["BAG", "BAGS", "SHOPPER", "STORAGE", "BASKET", "BASKETS", "HAMPER", "TRUNK",
         "CRATE", "CRATES", "TIDY", "CASE", "CONTAINER", "CHEST", "PEGS"],
    ),
    (
        "Kitchen & Dining",
        ["CAKE", "CAKES", "CAKESTAND", "TEA", "TEACUP", "TEAPOT", "MUG", "MUGS", "CUP",
         "CUPS", "SAUCER", "PLATE", "PLATES", "BOWL", "BOWLS", "CUTLERY", "JAR", "JARS",
         "JUG", "BAKING", "KITCHEN", "APRON", "NAPKINS", "NAPKIN", "LUNCH", "PANTRY",
         "COOKIE", "RECIPE", "SPOON", "SPOONS", "GLASS", "GLASSES", "TRAY", "BREAD",
         "EGG", "SUGAR", "MILK", "POPCORN", "SNACK", "JAM", "CHOPPING", "COASTER",
         "COASTERS", "TOAST", "BEAKER", "TUMBLER", "DOILY", "DOILIES", "DOILEY",
         "CUTTER", "CUTTERS", "OVEN GLOVE", "FRYING PAN", "BUTTER DISH", "CASES", "SCALES", "COFFEE", "CHOCOLATE", "BOTTLE", "TINS", "TIN",
         "TEATOWEL", "TEA TOWEL", "TOWELS", "DINER", "PICNIC", "PLACEMATS", "PLACEMAT"],
    ),
    (
        "Toys & Kids",
        ["TOY", "TOYS", "DOLL", "DOLLY", "DOLLS", "SPACEBOY", "CHILDRENS", "CHILDS",
         "CHILD", "KIDS", "BABY", "GAME", "GAMES", "PUZZLE", "JIGSAW", "HARMONICA",
         "SKIPPING", "PLAYHOUSE", "DOMINOES", "TEDDY", "MONSTER", "SOLDIER", "SOLDIERS",
         "SPINNING", "BINGO", "SNAKES & LADDERS", "NAUGHTS & CROSSES", "GLIDERS", "PIGGY BANK", "TORCH", "KNITTING NANCY", "BLOCK WORD", "MARBLES", "PIRATE", "DINOSAUR",
         "BUBBLES", "RATTLE", "BOOM BOX"],
    ),
    (
        "Stationery & Craft",
        ["PEN", "PENS", "PENCIL", "PENCILS", "NOTEBOOK", "STICKER", "STICKERS", "CRAFT",
         "SEWING", "KIT", "BOOK", "ERASER", "STAMP", "ENVELOPE", "ENVELOPES", "PAPER",
         "FELTCRAFT", "MAGNET", "MAGNETS", "CALENDAR", "TAPE", "NOTE", "NOTES", "RULER",
         "CHALK", "MEMOBOARD", "MEMO BOARD", "BLACK BOARD", "BLACKBOARD", "PAINT", "CLAY", "COLOURING", "DIARY", "JOURNAL", "BOOKMARK", "PAD", "WRITING"],
    ),
    (
        "Garden & Outdoor",
        ["GARDEN", "PARASOL", "BIRD", "BIRDHOUSE", "WATERING", "PLANT", "PLANTER",
         "HERB", "HERBS", "UMBRELLA", "FLOWER POT", "POTTING", "SEED", "SEEDS",
         "BIRDCAGE", "FEEDER", "LADDER", "WINDMILL", "TRELLIS", "BUCKET", "SPADE"],
    ),
    (
        "Fashion & Accessories",
        ["NECKLACE", "BRACELET", "EARRINGS", "RING", "HAIR", "PURSE", "WALLET",
         "SCARF", "CHARM", "JEWEL", "JEWELLED", "BROOCH", "SLIPPERS", "GLOVES", "HAT",
         "HANDBAG", "BEADS", "DIAMANTE", "CRYSTAL", "COMPACT MIRROR", "PASSPORT",
         "KEYRING", "KEY-RING", "HAND WARMER", "LIP GLOSS", "PONCHO", "SOMBRERO", "SUNGLASSES", "BANGLE", "BRACELETS", "WATCH", "LIPSTICK"],
    ),
    (
        "Home Décor",
        ["HEART", "HEARTS", "HOLDER", "FRAME", "SIGN", "CLOCK", "MIRROR", "CUSHION",
         "DOORMAT", "HOOK", "HOOKS", "DRAWER", "CABINET", "KNOB", "ORNAMENT",
         "DECORATION", "HANGING", "WALL", "VASE", "PHOTO", "PICTURE", "CHALKBOARD",
         "HOT WATER", "THROW", "QUILT", "BLANKET", "WREATH", "DOORSTOP", "PLAQUE",
         "WICKER", "BOX", "BOXES", "TRINKET", "SHELF", "DOOR", "CHAIR", "TABLE",
         "COAT RACK", "RACK", "LETTERS", "ALPHABET", "SCULPTURE", "STAND", "FAN",
         "CLOCHE", "PAPERWEIGHT", "FLOWER", "FLOWERS", "ROSE", "ROSES", "LAVENDER",
         "BELL", "BELLS", "CHIME", "CURTAIN", "BATHROOM", "SOAP", "TOILET", "MAT"],
    ),
]

OTHER = "Other"
CATEGORIES: list[str] = [name for name, _ in CATEGORY_RULES] + [OTHER]

_COMPILED = [
    (name, re.compile(r"(?<![A-Z0-9])(?:" + "|".join(re.escape(k) for k in keywords) + r")(?![A-Z0-9])"))
    for name, keywords in CATEGORY_RULES
]


def categorize(description: str | None) -> str:
    """Return the category for a product description (case-insensitive)."""
    if not description:
        return OTHER
    text = " ".join(str(description).upper().split())
    for name, pattern in _COMPILED:
        if pattern.search(text):
            return name
    return OTHER
