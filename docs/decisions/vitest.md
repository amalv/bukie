# Vitest

Vitest is a test runner built specifically for Vite. It's chosen for this project due to its seamless integration with Vite, support for modern JavaScript features, and its efficient test isolation.

Vitest leverages Vite's fast module system for running tests, resulting in a significantly faster test execution compared to traditional JavaScript test runners. This makes the feedback loop during test-driven development incredibly fast.

Vitest supports modern JavaScript features out of the box, including ES modules, top-level await, and more. This allows writing tests in the same way as writing the source code, enhancing the development experience.

Moreover, Vitest runs each test file in isolation in a separate Vite server, preventing tests from affecting each other and ensuring accurate test results. This makes Vitest a compelling choice for this project.