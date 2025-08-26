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

    rated = str(mpaa).lower()
    if rated == 'rated u' or rated == 'rated 0' or rated == 'rated g' or rated =='rated c':
        return 0
    elif rated == 'rated pg' or rated == 'rated 6':
        return 6
    elif rated == 'rated t' or rated == 'rated pg-13' or rated == 'rated 12' or rated == 'rated 12a' or rated == 'rated tp':
        return 12
    elif rated == 'rated 16' or rated == 'rated 15':
        return 16
    elif rated == 'rated r' or rated == 'rated 18' or rated == 'rated 18+':
        return 18
    elif rated == 'rated':
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