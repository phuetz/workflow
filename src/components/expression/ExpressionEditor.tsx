import React, { useMemo } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { autocompletion, Completion, CompletionContext } from '@codemirror/autocomplete';
import { oneDark } from '@codemirror/theme-one-dark';
import { useWorkflowStore } from '../../store/workflowStore';

interface ExpressionEditorProps {
  value: string;
  onChange: (value: string) => void;
  nodeId: string;
  height?: string;
}

export default function ExpressionEditor({ value, onChange, nodeId, height = '120px' }: ExpressionEditorProps) {
  const { nodes, edges, nodeExecutionData, darkMode } = useWorkflowStore();

  const variableCompletions = useMemo(() => {
    const vars = new Set<string>();
    const visit = (id: string, visited = new Set<string>()) => {
      if (visited.has(id)) return;
      visited.add(id);
      edges.filter(e => e.target === id).forEach(e => {
        const source = nodes.find(n => n.id === e.source);
        const executionData = nodeExecutionData[e.source] as { output?: unknown } | undefined;
        const out = executionData?.output;
        if (source) {
          if (out && typeof out === 'object') {
            Object.keys(out).forEach(k => vars.add(`{{${source.data.label}.${k}}}`));
          } else {
            vars.add(`{{${source.data.label}}}`);
          }
          visit(e.source, visited);
        }
      });
    };
    visit(nodeId);
    return Array.from(vars).sort();
  }, [edges, nodes, nodeExecutionData, nodeId]);

  const createAutocompletionExtension = () => {
    const options: Completion[] = variableCompletions.map(v => ({ label: v, type: 'variable', apply: v }));
    return autocompletion({
      override: [
        (context: CompletionContext) => {
          const word = context.matchBefore(/\{\{[\w.]*|\w*/);
          if (!word || (word.from == word.to && !context.explicit)) return null;
          return {
            from: word.from,
            to: word.to,
            options
          };
        }
      ]
    });
  };

  const autocompletionExtension = useMemo(() => createAutocompletionExtension(), [variableCompletions]);

  return (
    <CodeMirror
      value={value}
      height={height}
      theme={darkMode ? oneDark : 'light'}
      extensions={[javascript(), autocompletionExtension]}
      onChange={(val) => onChange(val)}
      basicSetup={{ lineNumbers: false }}
    />
  );
}
