import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { build } from 'vite';
import tailwindcss from '@tailwindcss/vite';

// Vite/Rollup build for environments that cannot launch esbuild subprocesses.
// Full type validation remains a required separate step (npm run typecheck).
const root = fileURLToPath(new URL('../apps/web', import.meta.url));
await build({
  configFile: false,
  root,
  resolve: { preserveSymlinks: true },
  esbuild: false,
  keepProcessEnv: true,
  environments: { client: { keepProcessEnv: true } },
  plugins: [
    {
      name: 'typescript-in-process',
      enforce: 'pre',
      transform(source, id) {
        const filename = id.split('?')[0];
        if (!/\.[cm]?[jt]sx?$/.test(filename)) return null;
        const result = ts.transpileModule(source, {
          fileName: filename,
          reportDiagnostics: true,
          compilerOptions: {
            target: ts.ScriptTarget.ES2022,
            module: ts.ModuleKind.ESNext,
            jsx: ts.JsxEmit.ReactJSX,
            sourceMap: true,
            allowJs: true,
          },
          transformers: {
            before: [(context) => {
              const visitor = (node) => {
                if (ts.isPropertyAccessExpression(node) && ts.isMetaProperty(node.expression) &&
                    node.expression.keywordToken === ts.SyntaxKind.ImportKeyword) {
                  if (node.name.text === 'hot') return context.factory.createFalse();
                  if (node.name.text === 'env') {
                    return context.factory.createObjectLiteralExpression([
                      context.factory.createPropertyAssignment('MODE', context.factory.createStringLiteral('production')),
                      context.factory.createPropertyAssignment('PROD', context.factory.createTrue()),
                      context.factory.createPropertyAssignment('DEV', context.factory.createFalse()),
                      context.factory.createPropertyAssignment('SSR', context.factory.createFalse()),
                      context.factory.createPropertyAssignment('BASE_URL', context.factory.createStringLiteral('/')),
                    ]);
                  }
                }
                if (ts.isPropertyAccessExpression(node) && node.name.text === 'NODE_ENV' &&
                    ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === 'env' &&
                    ts.isIdentifier(node.expression.expression) && node.expression.expression.text === 'process') {
                  return context.factory.createStringLiteral('production');
                }
                if (ts.isPropertyAccessExpression(node) && node.name.text === 'env' &&
                    ts.isIdentifier(node.expression) && node.expression.text === 'process') {
                  return context.factory.createObjectLiteralExpression();
                }
                return ts.visitEachChild(node, visitor, context);
              };
              return (sourceFile) => ts.visitNode(sourceFile, visitor);
            }],
          },
        });
        for (const diagnostic of result.diagnostics ?? []) {
          if (diagnostic.category === ts.DiagnosticCategory.Error) {
            this.error(ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));
          }
        }
        return { code: result.outputText, map: result.sourceMapText ?? null };
      },
    },
    tailwindcss(),
  ],
  build: { target: 'esnext', minify: false, cssMinify: false,
    rollupOptions: { onwarn(warning, warn) {
      if (warning.code === 'MODULE_LEVEL_DIRECTIVE' && warning.message.includes('use client')) return;
      warn(warning);
    } },
  },
});
