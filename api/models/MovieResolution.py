from enum import Enum

# SD (Standard Definition)	720 x 576 (PAL) / 720 x 480 (NTSC)	VHS, DVD, digitales Fernsehen
# HD (High Definition)	1280 x 720	Blu-ray, HD-Streaming, digitales Fernsehen
# Full HD	1920 x 1080	Blu-ray, DVDs (BD), HD-Streaming
# QHD (Quad HD)	2560 x 1440	Blu-ray (Ultra HD), PC-Monitore, Streaming
# 4K UHD (Ultra High Definition)	3840 x 2160	Ultra HD Blu-ray, 4K-Streaming, Fernseher
# 8K UHD	7680 x 4320	8K-Blu-ray (zukunftsorientiert), 8K-Streaming (in Entwicklung)
class MovieResolution(Enum):
    LOWER = "lower"
    SD = "sd"
    HD = "hd"
    FHD = "fhd"
    UHD = "uhd"
    HIGHER = "higher"
    
    def __str__(self) -> str:
        return self.name.lower()

@staticmethod
def fromResolution(width: int|None, height: int|None) -> MovieResolution|None:
    if width is None or height is None:
        return None

    if width < 720 and height < 480:
        return MovieResolution.LOWER
    elif width >= 720 and height >= 480 and width < 1280 and height < 720:
        return MovieResolution.SD
    elif width >= 1280 and height >= 720 and width < 1920 and height < 1080:
        return MovieResolution.HD
    elif width >= 1920 and height >= 1080 and width < 3840 and height < 2160:
        return MovieResolution.FHD
    elif width >= 3840 and height >= 2160 and width < 7680 and height < 4320:
        return MovieResolution.UHD
    elif width >= 7680 and height >= 4320:
        return MovieResolution.HIGHER

    return None