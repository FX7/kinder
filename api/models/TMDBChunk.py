from datetime import date


class TMDBChunk():

    def __init__(self, release_date_start: date|None, release_date_end: date|None, total):
        self.release_date_start = release_date_start
        self.release_date_end = release_date_end
        self.total = total