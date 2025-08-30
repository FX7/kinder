import logging


logger = logging.getLogger(__name__)

def extract_age_rating(rating) -> int|None:
    if rating is None or rating == '':
        return None
    
    rating = str(rating).lower()

    if rating.startswith('rated'):
        return mpaa_to_fsk(rating)
    return extract_fsk(rating)


def mpaa_to_fsk(mpaa) -> int | None:
    if mpaa is None or mpaa == '':
        return None

    rated = str(mpaa).lower().replace('rated ', '').strip()
    if rated == 'u' or rated == '0' or rated == 'g' or rated =='c':
        return 0
    elif rated == 'pg' or rated == '6':
        return 6
    elif rated == 't' or rated == 'pg-13' or rated == '12' or rated == '12a' or rated == 'tp':
        return 12
    elif rated == '16' or rated == '15':
        return 16
    elif rated == 'r' or rated == '18' or rated == '18+':
        return 18
    elif rated == '':
        return None
    else:
        logger.error(f"couldnt transform mpaa '{mpaa}' to fsk")
        return None


def extract_fsk(rating) -> int | None:
    if rating is None or rating == '':
      return None
    
    try:
      rated = str(rating).lower().replace('fsk-', '')
      return int(rated)
    except ValueError:
      logger.error(f"couldnt extract fsk {rating}")
      return None