/**
 * languages.js — Language configurations for CodeMirror 5 and the execution backend.
 *
 * CodeMirror 5 uses string-based modes (imported separately).
 * The `cmMode` field maps to what you pass to `editor.setOption('mode', ...)`.
 */

export const LANGUAGES = [
    {
        id: 'javascript',
        label: 'JavaScript',
        cmMode: { name: 'javascript', json: false },
        extension: 'main.js',
        template: `// JavaScript — Hello World
console.log("Hello, World!");
`,
    },
    {
        id: 'python',
        label: 'Python',
        cmMode: 'python',
        extension: 'main.py',
        template: `# Python — Hello World
print("Hello, World!")
`,
    },
    {
        id: 'java',
        label: 'Java',
        // CodeMirror 5 clike mode handles Java when `name: 'text/x-java'`
        cmMode: 'text/x-java',
        extension: 'Main.java',
        template: `// Java — Hello World
// Note: class must be named Main
public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, World!");
    }
}
`,
    },
    {
        id: 'cpp',
        label: 'C++',
        // CodeMirror 5 clike mode handles C++ when `name: 'text/x-c++src'`
        cmMode: 'text/x-c++src',
        extension: 'main.cpp',
        template: `// C++ — Hello World
#include <iostream>
using namespace std;

int main() {
    cout << "Hello, World!" << endl;
    return 0;
}
`,
    },
];

/** Quick lookup by id */
export const LANGUAGE_MAP = Object.fromEntries(LANGUAGES.map((l) => [l.id, l]));

export const DEFAULT_LANGUAGE = LANGUAGES[0]; // javascript
