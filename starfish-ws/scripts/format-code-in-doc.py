#!/bin/env python3
import json
import sys


def format_code(c, line_number):
    if c[0].startswith('[N'):
        return c

    if c[0].startswith('{') or c[0].startswith('['):
        return format_code0(c, line_number)

    return c


def format_code0(c, line_number):
    s = ''.join([i.strip() for i in c])
    try:
        v = json.loads(s)
    except ValueError as e:
        print('current line number: %s' % line_number, file=sys.stderr)
        raise e

    return json.dumps(v, sort_keys=True, indent=2).split("\n")


def format(f):
    output, content = [], None
    with open(f, encoding='utf8') as f:
        content = f.read()

    codes, code_start = [], False
    for i, line in enumerate(content.split("\n")):
        if line.startswith("```javascript"):
            output.append(line)
            code_start = True
            continue

        if code_start:
            if line.startswith("```"):
                output.extend(format_code(codes, i))
                output.append("```")
                codes, code_start = [], False
            else:
                codes.append(line.strip())
        else:
            output.append(line)

    return '\n'.join(output)


if __name__ == '__main__':
    print(format(sys.argv[1]).strip())
