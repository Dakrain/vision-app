#!/usr/bin/env python3
"""Builds src/renderer/locales/{vi,en,zh}.json from the parts in
src/renderer/locales/_parts/<part>/{vi,en,zh}.json, (desktop). Keys are typed
through src/renderer/i18n/i18next.d.ts (vi.json).

Each part owns its own top-level groups (base: common, language; others:
their feature). A key must exist in all three languages of its part, and
two parts may not define the same key. Safe to run concurrently (a lock).
"""
import fcntl, json, os, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TR = os.path.join(ROOT, 'src', 'renderer', 'locales')
PARTS = os.path.join(TR, '_parts')
LANGS = ['vi', 'en', 'zh']


def flatten(d, prefix=''):
    out = {}
    for k, v in d.items():
        key = f'{prefix}.{k}' if prefix else k
        if isinstance(v, dict):
            out.update(flatten(v, key))
        else:
            out[key] = v
    return out


def unflatten(flat):
    out = {}
    for key in sorted(flat):
        node = out
        parts = key.split('.')
        for p in parts[:-1]:
            node = node.setdefault(p, {})
            if not isinstance(node, dict):
                raise SystemExit(f'key clash at {key}')
        node[parts[-1]] = flat[key]
    return out


def main():
    lock = open(os.path.join(TR, '.merge.lock'), 'w')
    fcntl.flock(lock, fcntl.LOCK_EX)
    merged = {l: {} for l in LANGS}
    owner = {}
    errors = []
    for part in sorted(os.listdir(PARTS)):
        pdir = os.path.join(PARTS, part)
        if not os.path.isdir(pdir):
            continue
        flats = {}
        for l in LANGS:
            path = os.path.join(pdir, f'{l}.json')
            if not os.path.exists(path):
                flats[l] = {}
                continue
            try:
                flats[l] = flatten(json.load(open(path, encoding='utf8')))
            except json.JSONDecodeError as e:
                errors.append(f'{part}/{l}.json: invalid JSON: {e}')
                flats[l] = {}
        keys = set().union(*[set(f) for f in flats.values()])
        for k in sorted(keys):
            missing = [l for l in LANGS if k not in flats[l]]
            if missing:
                errors.append(f'{part}: {k} missing in {", ".join(missing)}')
            if k in owner and owner[k] != part:
                errors.append(f'{k} defined by both {owner[k]} and {part}')
            owner[k] = part
            for l in LANGS:
                if k in flats[l]:
                    merged[l][k] = flats[l][k]
    if errors:
        print('\n'.join(errors), file=sys.stderr)
        raise SystemExit(1)
    for l in LANGS:
        with open(os.path.join(TR, f'{l}.json'), 'w', encoding='utf8') as f:
            json.dump(unflatten(merged[l]), f, ensure_ascii=False, indent=2)
            f.write('\n')
    print(f'{len(merged["vi"])} keys merged')


if __name__ == '__main__':
    main()

