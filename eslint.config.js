import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import r3f from '@react-three/eslint-plugin';
import prettier from 'eslint-config-prettier';

export default [
  // Don't lint dead/fallback/generated/verbatim/tooling paths (mirrors .coderabbit.yaml scope).
  { ignores: ['dist', '_archive', 'website', 'node_modules', '.claude', 'public'] },

  js.configs.recommended,

  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.node },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    settings: { react: { version: 'detect' } },
    plugins: {
      react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      'jsx-a11y': jsxA11y,
      '@react-three': r3f,
    },
    rules: {
      // Accessibility (recommended set) — operationalizes the WCAG AA guardrail.
      ...jsxA11y.flatConfigs.recommended.rules,

      // React, new JSX transform (no React import needed).
      'react/react-in-jsx-scope': 'off',
      'react/jsx-uses-react': 'off',
      'react/jsx-uses-vars': 'error',
      'react/jsx-key': 'error',
      'react/prop-types': 'off', // no PropTypes in this codebase
      'react/no-unknown-property': 'off', // three.js JSX props (args, attach, position, intensity…)

      // Hooks — highest-value rules for this codebase's effects/frame loops.
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // Vite Fast Refresh safety.
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],

      // R3F frame-loop performance (guards useFrame in CameraRig/Wanderer).
      '@react-three/no-clone-in-loop': 'warn',
      '@react-three/no-new-in-loop': 'warn',

      'no-unused-vars': ['warn', { varsIgnorePattern: '^[A-Z_]' }],
    },
  },

  // MUST stay last — disables formatting rules that conflict with Prettier.
  prettier,
];
