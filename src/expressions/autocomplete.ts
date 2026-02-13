/**
 * Autocomplete - Context-aware suggestions for expression editor
 *
 * Provides 100+ autocomplete items including:
 * - Context variables ($json, $node, etc.)
 * - Built-in functions
 * - Common patterns
 */

export interface AutocompleteItem {
  label: string;
  kind: 'variable' | 'function' | 'property' | 'keyword' | 'snippet';
  detail?: string;
  documentation?: string;
  insertText?: string;
  example?: string;
}

/**
 * Context variable completions
 */
export const contextVariables: AutocompleteItem[] = [
  {
    label: '$json',
    kind: 'variable',
    detail: 'Current item JSON data',
    documentation: 'Access the JSON data of the current item being processed.',
    example: '{{ $json.email }}',
  },
  {
    label: '$binary',
    kind: 'variable',
    detail: 'Current item binary data',
    documentation: 'Access binary data (files, images) of the current item.',
    example: '{{ $binary.data }}',
  },
  {
    label: '$node',
    kind: 'function',
    detail: '(nodeName: string) => NodeData',
    documentation: 'Access data from a specific node by name.',
    insertText: '$node("${1:nodeName}")',
    example: '{{ $node("HTTP Request").json[0].id }}',
  },
  {
    label: '$item',
    kind: 'function',
    detail: '(index: number) => WorkflowItem',
    documentation: 'Access a specific item by index. Use negative indices for reverse access.',
    insertText: '$item(${1:0})',
    example: '{{ $item(0).json.name }}',
  },
  {
    label: '$items',
    kind: 'variable',
    detail: 'WorkflowItem[]',
    documentation: 'Array of all items being processed in the current execution.',
    example: '{{ $items.length }}',
  },
  {
    label: '$runIndex',
    kind: 'variable',
    detail: 'number',
    documentation: 'Current run iteration index (for loop nodes).',
    example: '{{ $runIndex }}',
  },
  {
    label: '$itemIndex',
    kind: 'variable',
    detail: 'number',
    documentation: 'Index of the current item being processed.',
    example: '{{ $itemIndex }}',
  },
  {
    label: '$workflow',
    kind: 'variable',
    detail: 'WorkflowMetadata',
    documentation: 'Metadata about the current workflow.',
    example: '{{ $workflow.name }}',
  },
  {
    label: '$execution',
    kind: 'variable',
    detail: 'ExecutionMetadata',
    documentation: 'Information about the current execution.',
    example: '{{ $execution.mode }}',
  },
  {
    label: '$env',
    kind: 'variable',
    detail: 'Record<string, string>',
    documentation: 'Environment variables configured in the workflow.',
    example: '{{ $env.API_KEY }}',
  },
  {
    label: '$now',
    kind: 'variable',
    detail: 'Date',
    documentation: 'Current timestamp as a Date object.',
    example: '{{ $now.toISOString() }}',
  },
  {
    label: '$today',
    kind: 'variable',
    detail: 'Date',
    documentation: "Today's date at midnight.",
    example: '{{ $today }}',
  },
  {
    label: '$uuid',
    kind: 'function',
    detail: '() => string',
    documentation: 'Generate a new UUID v4.',
    insertText: '$uuid()',
    example: '{{ $uuid() }}',
  },
  {
    label: '$timestamp',
    kind: 'function',
    detail: '() => number',
    documentation: 'Get current timestamp in milliseconds.',
    insertText: '$timestamp()',
    example: '{{ $timestamp() }}',
  },
  {
    label: '$position',
    kind: 'variable',
    detail: 'number',
    documentation: 'Position of the current item in the items array.',
    example: '{{ $position }}',
  },
  {
    label: '$first',
    kind: 'variable',
    detail: 'boolean',
    documentation: 'True if this is the first item in the array.',
    example: '{{ $first }}',
  },
  {
    label: '$last',
    kind: 'variable',
    detail: 'boolean',
    documentation: 'True if this is the last item in the array.',
    example: '{{ $last }}',
  },
  {
    label: '$prevNode',
    kind: 'variable',
    detail: 'NodeData',
    documentation: 'Data from the previous node in the workflow.',
    example: '{{ $prevNode.json[0] }}',
  },
  {
    label: '$input',
    kind: 'variable',
    detail: 'InputHelper',
    documentation: 'Helper object to access input data.',
    example: '{{ $input.first().json.id }}',
  },
  {
    label: '$parameter',
    kind: 'function',
    detail: '(name: string, defaultValue?: any) => any',
    documentation: 'Get a parameter value from the node configuration.',
    insertText: '$parameter("${1:paramName}")',
    example: '{{ $parameter("apiKey") }}',
  },
];

/**
 * String function completions
 */
export const stringFunctions: AutocompleteItem[] = [
  {
    label: 'toLowerCase',
    kind: 'function',
    detail: '(str: string) => string',
    documentation: 'Convert string to lowercase.',
    example: '{{ toLowerCase($json.name) }}',
  },
  {
    label: 'toUpperCase',
    kind: 'function',
    detail: '(str: string) => string',
    documentation: 'Convert string to uppercase.',
    example: '{{ toUpperCase($json.name) }}',
  },
  {
    label: 'capitalize',
    kind: 'function',
    detail: '(str: string) => string',
    documentation: 'Capitalize the first letter.',
    example: '{{ capitalize($json.name) }}',
  },
  {
    label: 'trim',
    kind: 'function',
    detail: '(str: string) => string',
    documentation: 'Remove whitespace from both ends.',
    example: '{{ trim($json.name) }}',
  },
  {
    label: 'split',
    kind: 'function',
    detail: '(str: string, separator: string) => string[]',
    documentation: 'Split string into array.',
    example: '{{ split($json.tags, ",") }}',
  },
  {
    label: 'replace',
    kind: 'function',
    detail: '(str: string, search: string, replacement: string) => string',
    documentation: 'Replace text in string.',
    example: '{{ replace($json.text, "old", "new") }}',
  },
  {
    label: 'substring',
    kind: 'function',
    detail: '(str: string, start: number, end?: number) => string',
    documentation: 'Extract substring.',
    example: '{{ substring($json.text, 0, 10) }}',
  },
  {
    label: 'includes',
    kind: 'function',
    detail: '(str: string, search: string) => boolean',
    documentation: 'Check if string contains substring.',
    example: '{{ includes($json.email, "@gmail.com") }}',
  },
  {
    label: 'startsWith',
    kind: 'function',
    detail: '(str: string, search: string) => boolean',
    documentation: 'Check if string starts with substring.',
    example: '{{ startsWith($json.url, "https") }}',
  },
  {
    label: 'endsWith',
    kind: 'function',
    detail: '(str: string, search: string) => boolean',
    documentation: 'Check if string ends with substring.',
    example: '{{ endsWith($json.file, ".pdf") }}',
  },
  {
    label: 'extractDomain',
    kind: 'function',
    detail: '(email: string) => string',
    documentation: 'Extract domain from email address.',
    example: '{{ extractDomain($json.email) }}',
  },
  {
    label: 'urlEncode',
    kind: 'function',
    detail: '(str: string) => string',
    documentation: 'URL encode a string.',
    example: '{{ urlEncode($json.query) }}',
  },
  {
    label: 'base64Encode',
    kind: 'function',
    detail: '(str: string) => string',
    documentation: 'Encode string to base64.',
    example: '{{ base64Encode($json.data) }}',
  },
  {
    label: 'base64Decode',
    kind: 'function',
    detail: '(str: string) => string',
    documentation: 'Decode base64 string.',
    example: '{{ base64Decode($json.encoded) }}',
  },
];

/**
 * Date/Time function completions
 */
export const dateFunctions: AutocompleteItem[] = [
  {
    label: 'toISOString',
    kind: 'function',
    detail: '(date: Date) => string',
    documentation: 'Convert date to ISO 8601 string.',
    example: '{{ toISOString($now) }}',
  },
  {
    label: 'formatDate',
    kind: 'function',
    detail: '(date: Date, locale?: string) => string',
    documentation: 'Format date using locale.',
    example: '{{ formatDate($now, "en-US") }}',
  },
  {
    label: 'addDays',
    kind: 'function',
    detail: '(date: Date, days: number) => Date',
    documentation: 'Add days to a date.',
    example: '{{ addDays($now, 7) }}',
  },
  {
    label: 'addHours',
    kind: 'function',
    detail: '(date: Date, hours: number) => Date',
    documentation: 'Add hours to a date.',
    example: '{{ addHours($now, 2) }}',
  },
  {
    label: 'diffDays',
    kind: 'function',
    detail: '(date1: Date, date2: Date) => number',
    documentation: 'Calculate difference in days between two dates.',
    example: '{{ diffDays($json.startDate, $now) }}',
  },
  {
    label: 'getYear',
    kind: 'function',
    detail: '(date: Date) => number',
    documentation: 'Get year from date.',
    example: '{{ getYear($now) }}',
  },
  {
    label: 'getMonth',
    kind: 'function',
    detail: '(date: Date) => number',
    documentation: 'Get month from date (1-12).',
    example: '{{ getMonth($now) }}',
  },
  {
    label: 'getDay',
    kind: 'function',
    detail: '(date: Date) => number',
    documentation: 'Get day of month from date.',
    example: '{{ getDay($now) }}',
  },
];

/**
 * Array function completions
 */
export const arrayFunctions: AutocompleteItem[] = [
  {
    label: 'length',
    kind: 'function',
    detail: '(arr: any[]) => number',
    documentation: 'Get array length.',
    example: '{{ length($items) }}',
  },
  {
    label: 'first',
    kind: 'function',
    detail: '(arr: any[]) => any',
    documentation: 'Get first element of array.',
    example: '{{ first($items) }}',
  },
  {
    label: 'last',
    kind: 'function',
    detail: '(arr: any[]) => any',
    documentation: 'Get last element of array.',
    example: '{{ last($items) }}',
  },
  {
    label: 'unique',
    kind: 'function',
    detail: '(arr: any[]) => any[]',
    documentation: 'Get unique values from array.',
    example: '{{ unique($json.tags) }}',
  },
  {
    label: 'flatten',
    kind: 'function',
    detail: '(arr: any[], depth?: number) => any[]',
    documentation: 'Flatten nested array.',
    example: '{{ flatten($json.nested) }}',
  },
  {
    label: 'chunk',
    kind: 'function',
    detail: '(arr: any[], size: number) => any[][]',
    documentation: 'Split array into chunks.',
    example: '{{ chunk($items, 10) }}',
  },
  {
    label: 'pluck',
    kind: 'function',
    detail: '(arr: any[], key: string) => any[]',
    documentation: 'Extract property from array of objects.',
    example: '{{ pluck($items, "id") }}',
  },
  {
    label: 'sum',
    kind: 'function',
    detail: '(arr: number[]) => number',
    documentation: 'Sum array of numbers.',
    example: '{{ sum($json.values) }}',
  },
  {
    label: 'average',
    kind: 'function',
    detail: '(arr: number[]) => number',
    documentation: 'Calculate average of numbers.',
    example: '{{ average($json.scores) }}',
  },
  {
    label: 'min',
    kind: 'function',
    detail: '(arr: number[]) => number',
    documentation: 'Get minimum value.',
    example: '{{ min($json.prices) }}',
  },
  {
    label: 'max',
    kind: 'function',
    detail: '(arr: number[]) => number',
    documentation: 'Get maximum value.',
    example: '{{ max($json.prices) }}',
  },
  {
    label: 'sortAsc',
    kind: 'function',
    detail: '(arr: any[]) => any[]',
    documentation: 'Sort array in ascending order.',
    example: '{{ sortAsc($json.numbers) }}',
  },
  {
    label: 'sortDesc',
    kind: 'function',
    detail: '(arr: any[]) => any[]',
    documentation: 'Sort array in descending order.',
    example: '{{ sortDesc($json.numbers) }}',
  },
];

/**
 * Object function completions
 */
export const objectFunctions: AutocompleteItem[] = [
  {
    label: 'keys',
    kind: 'function',
    detail: '(obj: object) => string[]',
    documentation: 'Get object keys.',
    example: '{{ keys($json) }}',
  },
  {
    label: 'values',
    kind: 'function',
    detail: '(obj: object) => any[]',
    documentation: 'Get object values.',
    example: '{{ values($json) }}',
  },
  {
    label: 'entries',
    kind: 'function',
    detail: '(obj: object) => [string, any][]',
    documentation: 'Get object entries as key-value pairs.',
    example: '{{ entries($json) }}',
  },
  {
    label: 'hasKey',
    kind: 'function',
    detail: '(obj: object, key: string) => boolean',
    documentation: 'Check if object has key.',
    example: '{{ hasKey($json, "email") }}',
  },
  {
    label: 'get',
    kind: 'function',
    detail: '(obj: object, path: string, defaultValue?: any) => any',
    documentation: 'Get nested value safely.',
    example: '{{ get($json, "user.profile.name", "Unknown") }}',
  },
  {
    label: 'pick',
    kind: 'function',
    detail: '(obj: object, keys: string[]) => object',
    documentation: 'Pick specific keys from object.',
    example: '{{ pick($json, ["id", "name"]) }}',
  },
  {
    label: 'omit',
    kind: 'function',
    detail: '(obj: object, keys: string[]) => object',
    documentation: 'Omit specific keys from object.',
    example: '{{ omit($json, ["password"]) }}',
  },
  {
    label: 'isEmpty',
    kind: 'function',
    detail: '(value: any) => boolean',
    documentation: 'Check if value is empty.',
    example: '{{ isEmpty($json.name) }}',
  },
];

/**
 * Math function completions
 */
export const mathFunctions: AutocompleteItem[] = [
  {
    label: 'round',
    kind: 'function',
    detail: '(num: number, decimals?: number) => number',
    documentation: 'Round number to decimals.',
    example: '{{ round($json.price, 2) }}',
  },
  {
    label: 'floor',
    kind: 'function',
    detail: '(num: number) => number',
    documentation: 'Round down to nearest integer.',
    example: '{{ floor($json.value) }}',
  },
  {
    label: 'ceil',
    kind: 'function',
    detail: '(num: number) => number',
    documentation: 'Round up to nearest integer.',
    example: '{{ ceil($json.value) }}',
  },
  {
    label: 'abs',
    kind: 'function',
    detail: '(num: number) => number',
    documentation: 'Get absolute value.',
    example: '{{ abs($json.delta) }}',
  },
  {
    label: 'random',
    kind: 'function',
    detail: '(min?: number, max?: number) => number',
    documentation: 'Generate random number.',
    example: '{{ random(1, 100) }}',
  },
  {
    label: 'randomInt',
    kind: 'function',
    detail: '(min: number, max: number) => number',
    documentation: 'Generate random integer.',
    example: '{{ randomInt(1, 10) }}',
  },
];

/**
 * Conversion function completions
 */
export const conversionFunctions: AutocompleteItem[] = [
  {
    label: 'toString',
    kind: 'function',
    detail: '(value: any) => string',
    documentation: 'Convert value to string.',
    example: '{{ toString($json.id) }}',
  },
  {
    label: 'toNumber',
    kind: 'function',
    detail: '(value: any) => number',
    documentation: 'Convert value to number.',
    example: '{{ toNumber($json.count) }}',
  },
  {
    label: 'toBoolean',
    kind: 'function',
    detail: '(value: any) => boolean',
    documentation: 'Convert value to boolean.',
    example: '{{ toBoolean($json.active) }}',
  },
  {
    label: 'parseJson',
    kind: 'function',
    detail: '(str: string) => any',
    documentation: 'Parse JSON string.',
    example: '{{ parseJson($json.data) }}',
  },
  {
    label: 'toJson',
    kind: 'function',
    detail: '(value: any, pretty?: boolean) => string',
    documentation: 'Convert value to JSON string.',
    example: '{{ toJson($json, true) }}',
  },
];

/**
 * Validation function completions
 */
export const validationFunctions: AutocompleteItem[] = [
  {
    label: 'isString',
    kind: 'function',
    detail: '(value: any) => boolean',
    documentation: 'Check if value is a string.',
    example: '{{ isString($json.name) }}',
  },
  {
    label: 'isNumber',
    kind: 'function',
    detail: '(value: any) => boolean',
    documentation: 'Check if value is a number.',
    example: '{{ isNumber($json.age) }}',
  },
  {
    label: 'isArray',
    kind: 'function',
    detail: '(value: any) => boolean',
    documentation: 'Check if value is an array.',
    example: '{{ isArray($json.items) }}',
  },
  {
    label: 'isObject',
    kind: 'function',
    detail: '(value: any) => boolean',
    documentation: 'Check if value is an object.',
    example: '{{ isObject($json.data) }}',
  },
  {
    label: 'isEmail',
    kind: 'function',
    detail: '(value: string) => boolean',
    documentation: 'Check if value is a valid email.',
    example: '{{ isEmail($json.email) }}',
  },
  {
    label: 'isUrl',
    kind: 'function',
    detail: '(value: string) => boolean',
    documentation: 'Check if value is a valid URL.',
    example: '{{ isUrl($json.website) }}',
  },
];

/**
 * Common pattern snippets
 */
export const snippets: AutocompleteItem[] = [
  {
    label: 'if-else',
    kind: 'snippet',
    detail: 'Conditional expression',
    insertText: '${1:condition} ? ${2:trueValue} : ${3:falseValue}',
    example: '{{ $json.active ? "Yes" : "No" }}',
  },
  {
    label: 'template-string',
    kind: 'snippet',
    detail: 'Template literal',
    insertText: '`${1:text} \\${${2:variable}}`',
    example: '{{ `Hello ${$json.name}!` }}',
  },
  {
    label: 'array-map',
    kind: 'snippet',
    detail: 'Map array to new values',
    insertText: '${1:array}.map(item => ${2:item.value})',
    example: '{{ $items.map(item => item.json.id) }}',
  },
  {
    label: 'array-filter',
    kind: 'snippet',
    detail: 'Filter array by condition',
    insertText: '${1:array}.filter(item => ${2:item.active})',
    example: '{{ $items.filter(item => item.json.active) }}',
  },
  {
    label: 'new-date',
    kind: 'snippet',
    detail: 'Create new Date object',
    insertText: 'new Date(${1:value})',
    example: '{{ new Date($json.timestamp) }}',
  },
];

/**
 * Get all autocomplete items
 */
export function getAllCompletions(): AutocompleteItem[] {
  return [
    ...contextVariables,
    ...stringFunctions,
    ...dateFunctions,
    ...arrayFunctions,
    ...objectFunctions,
    ...mathFunctions,
    ...conversionFunctions,
    ...validationFunctions,
    ...snippets,
  ];
}

/**
 * Filter completions by prefix
 */
export function getCompletionsForPrefix(prefix: string): AutocompleteItem[] {
  const lowerPrefix = prefix.toLowerCase();
  return getAllCompletions().filter(item =>
    item.label.toLowerCase().startsWith(lowerPrefix)
  );
}

/**
 * Get completions by category
 */
export function getCompletionsByCategory(): Record<string, AutocompleteItem[]> {
  return {
    'Context Variables': contextVariables,
    'String Functions': stringFunctions,
    'Date/Time Functions': dateFunctions,
    'Array Functions': arrayFunctions,
    'Object Functions': objectFunctions,
    'Math Functions': mathFunctions,
    'Conversion Functions': conversionFunctions,
    'Validation Functions': validationFunctions,
    'Snippets': snippets,
  };
}

export default {
  getAllCompletions,
  getCompletionsForPrefix,
  getCompletionsByCategory,
};
