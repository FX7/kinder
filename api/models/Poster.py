class Poster:

    def __init__(self, data: bytes, extension: str):
        self.data = data
        if extension is not None and extension != '':
            self.extension = extension
        else:
            self.extension = '.jpg'
