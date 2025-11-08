const esbuild = require("esbuild");
const fs = require("fs");
const path = require("path");

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

/**
 * @type {import('esbuild').Plugin}
 */
const esbuildProblemMatcherPlugin = {
	name: 'esbuild-problem-matcher',

	setup(build) {
		build.onStart(() => {
			console.log('[watch] build started');
		});
		build.onEnd((result) => {
			result.errors.forEach(({ text, location }) => {
				console.error(`✘ [ERROR] ${text}`);
				console.error(`    ${location.file}:${location.line}:${location.column}:`);
			});
			console.log('[watch] build finished');
		});
	},
};

/**
 * Plugin to copy EJS template files to dist directory
 * @type {import('esbuild').Plugin}
 */
const copyTemplatesPlugin = {
	name: 'copy-templates',

	setup(build) {
		build.onEnd(() => {
			// Copy EJS templates from src/generator/template to dist/generator/template
			const srcTemplateDir = path.join(__dirname, 'src', 'generator', 'template');
			const distTemplateDir = path.join(__dirname, 'dist', 'generator', 'template');

			// Create dist/generator/template directory if it doesn't exist
			if (!fs.existsSync(distTemplateDir)) {
				fs.mkdirSync(distTemplateDir, { recursive: true });
			}

			// Copy all .ejs files
			const templateFiles = fs.readdirSync(srcTemplateDir).filter(file => file.endsWith('.ejs'));
			templateFiles.forEach(file => {
				const srcPath = path.join(srcTemplateDir, file);
				const distPath = path.join(distTemplateDir, file);
				fs.copyFileSync(srcPath, distPath);
			});

			if (templateFiles.length > 0) {
				console.log(`[templates] Copied ${templateFiles.length} EJS template files to dist`);
			}
		});
	},
};

async function main() {
	const ctx = await esbuild.context({
		entryPoints: [
			'src/extension.ts'
		],
		bundle: true,
		format: 'cjs',
		minify: production,
		sourcemap: true,
		sourcesContent: true,
		platform: 'node',
		outfile: 'dist/extension.js',
		external: ['vscode'],
		logLevel: 'silent',
		plugins: [
			copyTemplatesPlugin,
			/* add to the end of plugins array */
			esbuildProblemMatcherPlugin,
		],
	});
	if (watch) {
		await ctx.watch();
	} else {
		await ctx.rebuild();
		await ctx.dispose();
	}
}

main().catch(e => {
	console.error(e);
	process.exit(1);
});
