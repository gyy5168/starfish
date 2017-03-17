import os
import re
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import itertools
from common import Singleton


class TextImage(object, metaclass=Singleton):
    filter_dict = {
        'BLUR': ImageFilter.BLUR,
        'CONTOUR': ImageFilter.CONTOUR,
        'DETAIL': ImageFilter.DETAIL,
        'EDGE_ENHANCE': ImageFilter.EDGE_ENHANCE,
        'EDGE_ENHANCE_MORE': ImageFilter.EDGE_ENHANCE_MORE,
        'EMBOSS': ImageFilter.EMBOSS,
        'FIND_EDGES': ImageFilter.FIND_EDGES,
        'SMOOTH': ImageFilter.SMOOTH,
        'SMOOTH_MORE': ImageFilter.SMOOTH_MORE,
        'SHARPEN': ImageFilter.SHARPEN
    }

    preset_color = {
        'cold': ['#69CECD', '#95CC68', ],
        'warm': ['#F26F46', '#FCB43F', '#9382C5', ],
    }

    EXTRACT_CN_FIRST = 1
    EXTRACT_CN_LAST = -1

    def __init__(self):
        self.default_font_name = '%s/../common/files/msyh.ttf'\
                                 % os.path.dirname(os.path.abspath(__file__))
        self.default_bold_font_name = '%s/../common/files/msyhbd.ttf'\
                                      % os.path.dirname(os.path.abspath(__file__))

    def get_bg_color(self, color_type, color_sand):
        if not color_type or color_type not in self.preset_color:
            colors = list(itertools.chain(*list(self.preset_color.values())))
        else:
            colors = self.preset_color.get(color_type)
        return colors[color_sand % len(colors)]

    def extract_text(self, text, extract_rule):
        reg_cn = re.compile(r"[\u4e00-\u9fff]+")  # Chinese characters
        _cn = ''.join(re.findall(reg_cn, text))
        if _cn:
            if extract_rule == self.EXTRACT_CN_FIRST:
                return _cn[:2]
            elif extract_rule == self.EXTRACT_CN_LAST:
                return _cn[-2:]

        # contains no Chinese characters
        return text[:1]

    def create(self, text, extract_rule,
               width, height,
               font_name=None, font_size=None,
               font_color='white', bold_font=False,
               bg_color_type='cold', bg_color_sand=0,
               image_filter=None,
               save_to=None, img_type="PNG"):

        text = self.extract_text(text, extract_rule)
        font = ImageFont.truetype(
            font_name or (self.default_bold_font_name if bold_font else self.default_font_name),
            font_size or int(min(width, height)/3))

        im = Image.new("RGB", (width, height),
                       self.get_bg_color(bg_color_type, bg_color_sand))
        draw = ImageDraw.Draw(im)
        text_x, text_y = font.getsize(text)
        x = int((width - text_x) / 2)
        y = int((height - text_y) / 2)
        draw.text((x, y), text, font=font, fill=font_color)

        if image_filter:
            real_filter = self.filter_dict[image_filter]
            im = im.filter(real_filter)

        if save_to:
            im.save(save_to, format=img_type)

        return im


def image_to_data(image, img_type="PNG"):
    from io import BytesIO
    output = BytesIO()
    image.save(output, format=img_type)
    contents = output.getvalue()
    output.close()
    return contents
