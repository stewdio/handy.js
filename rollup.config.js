import resolve from "@rollup/plugin-node-resolve";
import commonjs from "rollup-plugin-commonjs";
import { terser } from "rollup-plugin-terser";

export default {
	preserveEntrySignatures: 'false',
	output: {
		format: "esm",
		sourcemap: true
	},
	plugins: [
		resolve(),
		commonjs({
			include: ["node_modules/**"],
		}),
		terser()
	]
};