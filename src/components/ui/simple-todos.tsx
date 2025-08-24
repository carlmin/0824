import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { Clock, CheckCircle2, Circle, Loader2 } from 'lucide-react';

export interface SimpleTodo {
  id: string;
  title: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
}

interface SimpleTodosProps {
  todos: SimpleTodo[];
  totalTodos: number;
  completedTodos: number;
  className?: string;
}

const getStatusIcon = (status: SimpleTodo['status']) => {
  switch (status) {
    case 'pending':
      return <Circle className="h-4 w-4 text-gray-300" />;
    case 'in_progress':
      return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
    case 'completed':
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case 'failed':
      return <Circle className="h-4 w-4 text-red-400" />;
    default:
      return <Circle className="h-4 w-4 text-gray-300" />;
  }
};

export function SimpleTodos({ 
  todos, 
  totalTodos, 
  completedTodos, 
  className = ""
}: SimpleTodosProps) {
  const hasStarted = todos.some(todo => todo.status !== 'pending');
  const isCompleted = completedTodos === totalTodos && totalTodos > 0;

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Clock className="h-4 w-4 text-blue-500" />
            To-dos {totalTodos}
          </CardTitle>
          <span className="text-sm text-muted-foreground">
            {completedTodos}/{totalTodos}
          </span>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-2">
        {todos.map((todo, index) => (
          <div
            key={todo.id}
            className="flex items-center gap-3 text-sm"
          >
            {getStatusIcon(todo.status)}
            <span className={`
              ${todo.status === 'completed' ? 'text-green-700 line-through' : ''}
              ${todo.status === 'failed' ? 'text-red-600' : ''}
              ${todo.status === 'in_progress' ? 'text-blue-700 font-medium' : ''}
            `}>
              {todo.title}
            </span>
          </div>
        ))}
        
        {/* 상태 메시지 */}
        <div className="pt-2 text-center text-xs text-muted-foreground">
          {!hasStarted && "연구 계획이 수립되었습니다"}
          {hasStarted && !isCompleted && "연구를 진행하고 있습니다..."}
          {isCompleted && "🎉 모든 연구가 완료되었습니다!"}
        </div>
      </CardContent>
    </Card>
  );
}

export default SimpleTodos;
