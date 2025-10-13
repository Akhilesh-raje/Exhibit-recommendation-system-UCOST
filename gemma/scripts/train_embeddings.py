import subprocess
import sys
import os

def main():
    # Wrapper to run preprocess then build embeddings
    root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    pre = os.path.join(root, 'scripts', 'preprocess.py')
    build = os.path.join(root, 'scripts', 'build_embeddings.py')
    cmds = [
        [sys.executable, pre],
        [sys.executable, build]
    ]
    for c in cmds:
        print('Running:', ' '.join(c))
        r = subprocess.run(c)
        if r.returncode != 0:
            raise SystemExit(r.returncode)
    print('Embeddings ready.')

if __name__ == '__main__':
    main()


