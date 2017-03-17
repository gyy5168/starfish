#!/usr/bin/env python
import os
import shutil

from command import run

DEST_DIR = '/opt/mos/webapps/starfish-ws-docs'

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))


def markdown2html(src_file):
    filename = os.path.splitext(os.path.basename(src_file))[0]
    return run(
        'cd %s && /usr/bin/pandoc -s -S -t html5 --toc -c markdown.css %s -o %s/%s.html' %
        (CURRENT_DIR, src_file, DEST_DIR, filename)
    )


def copy_icon():
    shutil.copy('%s/favicon.ico' % CURRENT_DIR, DEST_DIR)


def copy_css():
    shutil.copy('%s/markdown.css' % CURRENT_DIR, DEST_DIR)


def main():
    docs_dir = os.path.dirname(os.path.abspath(__file__))
    for f in os.listdir(docs_dir):
        if not f.endswith('.md'):
            continue

        markdown2html('%s/%s' % (docs_dir, f))

    copy_icon()
    copy_css()


if __name__ == '__main__':
    main()
