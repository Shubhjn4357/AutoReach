import React from "react";
import { CheckSquare, Plus, Check, Calendar } from "lucide-react";
import { Task, Lead } from "../../shared/types";

interface TasksViewProps {
  tasks: Task[];
  leads: Lead[];
  pendingTasks: Task[];
  completedTasks: Task[];
  handleToggleTaskStatus: (task: Task) => void;
  setAddTaskModalOpen: (open: boolean) => void;
}

export default function TasksView({
  tasks,
  leads,
  pendingTasks,
  completedTasks,
  handleToggleTaskStatus,
  setAddTaskModalOpen
}: TasksViewProps) {
  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-6">
      
      {/* Task Header bar */}
      <div className="flex justify-between items-center bg-[var(--color-surface)] border border-[var(--color-border)] p-5 rounded-md shadow-sm">
        <div>
          <h2 className="text-base font-bold text-[var(--color-text-primary)]">Tasks Queue Manager</h2>
          <p className="text-xs text-[var(--color-text-secondary)] mt-1">Manage scheduled communication reminders, database cleanup, and sync tasks.</p>
        </div>

        <button
          onClick={() => setAddTaskModalOpen(true)}
          className="bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/95 text-white text-xs font-bold py-2 px-4 rounded-md flex items-center gap-1.5 cursor-pointer shadow-md transition-all"
        >
          <Plus size={14} /> Add Task
        </button>
      </div>

      {/* Task Summary Metrics */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] p-4 rounded-md text-center">
          <span className="text-[10px] text-[var(--color-text-muted)] font-bold uppercase tracking-wider block mb-1">Total Queue</span>
          <span className="text-xl font-black text-[var(--color-text-primary)]">{tasks.length}</span>
        </div>
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] p-4 rounded-md text-center">
          <span className="text-[10px] text-[var(--color-secondary)] font-bold uppercase tracking-wider block mb-1">Pending</span>
          <span className="text-xl font-black text-[var(--color-secondary)]">{pendingTasks.length}</span>
        </div>
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] p-4 rounded-md text-center">
          <span className="text-[10px] text-[var(--color-success)] font-bold uppercase tracking-wider block mb-1">Completed</span>
          <span className="text-xl font-black text-[var(--color-success)]">{completedTasks.length}</span>
        </div>
      </div>

      {/* Tasks List */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-md overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--color-border)] bg-black/5">
          <h3 className="text-xs font-bold text-[var(--color-text-primary)] uppercase tracking-wider">Queue Tasks</h3>
        </div>

        <div className="flex flex-col">
          {tasks.length === 0 ? (
            <div className="py-12 text-center flex flex-col items-center justify-center text-[var(--color-text-muted)]">
              <CheckSquare size={36} className="mb-2 opacity-40" />
              <span className="text-xs italic">No background tasks scheduled.</span>
            </div>
          ) : (
            tasks.map(task => {
              const associatedLead = leads.find(l => l.id === task.leadId);
              return (
                <div 
                  key={task.id} 
                  className="px-5 py-4 border-b border-[var(--color-border)] last:border-b-0 hover:bg-black/5 transition-all flex items-start justify-between gap-4"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    {/* Checkbox */}
                    <button
                      onClick={() => handleToggleTaskStatus(task)}
                      className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition-colors cursor-pointer ${
                        task.status === "COMPLETED" 
                          ? "bg-[var(--color-success)] border-[var(--color-success)] text-white" 
                          : "border-[var(--color-border)] hover:border-[var(--color-primary)]"
                      }`}
                    >
                      {task.status === "COMPLETED" && <Check size={12} />}
                    </button>

                    <div className="min-w-0">
                      <h4 className={`text-xs font-bold text-[var(--color-text-primary)] ${task.status === "COMPLETED" ? "line-through text-[var(--color-text-muted)]" : ""}`}>
                        {task.title}
                      </h4>
                      {task.description && (
                        <p className="text-[11px] text-[var(--color-text-secondary)] mt-1">{task.description}</p>
                      )}
                      
                      <div className="flex items-center gap-3 mt-2 text-[9px] text-[var(--color-text-muted)] flex-wrap">
                        {associatedLead && (
                          <span className="bg-[var(--color-primary)]/10 text-[var(--color-primary)] px-1.5 py-0.5 rounded-sm font-bold">
                            Lead: {associatedLead.name}
                          </span>
                        )}
                        {task.dueDate && (
                          <span className="flex items-center gap-1">
                            <Calendar size={10} />
                            Due: {new Date(task.dueDate).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <span className={`px-2 py-0.5 rounded-sm font-bold shrink-0 ${
                    task.status === "COMPLETED" ? "bg-[var(--color-success)]/10 text-[var(--color-success)]" : "bg-[var(--color-warning)]/10 text-[var(--color-warning)]"
                  }`}>
                    {task.status}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

    </div>
  );
}
