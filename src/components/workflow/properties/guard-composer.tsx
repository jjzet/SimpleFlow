'use client';

import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, X, ChevronRight, ChevronDown, Shield } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface GuardComposerProps {
  value: string;
  onChange: (value: string) => void;
}

type Operator =
  | 'exists'
  | 'eq'
  | 'neq'
  | 'gt'
  | 'lt'
  | 'gte'
  | 'lte'
  | 'in'
  | 'not in'
  | 'starts with';
type LogicalOperator = 'and' | 'or';
type Quantifier = 'all' | 'any' | 'none';

interface BaseNode {
  id: string;
}

interface GuardGroup extends BaseNode {
  type: 'group';
  conditions: GuardCondition[];
  operators: LogicalOperator[]; // Operators between conditions, length will be conditions.length - 1
}

interface GuardCondition extends BaseNode {
  type: 'condition';
  conditionType: 'field' | 'childTasks';
  field: string;
  operator: Operator;
  value?: string;
  quantifier?: Quantifier;
}

type GuardNode = GuardGroup | GuardCondition;

// Helper function to generate unique IDs
const generateId = () => Math.random().toString(36).substr(2, 9);

// Parse a guard string into our internal representation
const parseGuardString = (guardString: string): GuardGroup => {
  if (!guardString || guardString === "fields[''] exists") {
    return {
      id: generateId(),
      type: 'group',
      conditions: [
        {
          id: generateId(),
          type: 'condition',
          conditionType: 'field',
          field: '',
          operator: 'exists',
        },
      ],
      operators: [],
    };
  }

  // Handle childTasks guard format: "childTasks all (state in 'Resolved')"
  const childTasksMatch = guardString.match(
    /childTasks\s+(all|any|none)\s+\((\w+)\s+(\w+)\s+'([^']+)'\)/
  );
  if (childTasksMatch) {
    const [, quantifier, field, operator, value] = childTasksMatch;
    return {
      id: generateId(),
      type: 'group',
      conditions: [
        {
          id: generateId(),
          type: 'condition',
          conditionType: 'childTasks',
          quantifier: quantifier as Quantifier,
          field,
          operator: operator as Operator,
          value,
        },
      ],
      operators: [],
    };
  }

  // TODO: Implement full parsing logic for complex guards
  // For now, return a simple group with one condition
  return {
    id: generateId(),
    type: 'group',
    conditions: [
      {
        id: generateId(),
        type: 'condition',
        conditionType: 'field',
        field: '',
        operator: 'exists',
      },
    ],
    operators: [],
  };
};

// Convert our internal representation back to a guard string
const buildGuardString = (group: GuardGroup): string => {
  if (group.conditions.length === 0) return '';
  if (group.conditions.length === 1) {
    const condition = group.conditions[0];
    if (condition.conditionType === 'childTasks') {
      const quantifier = condition.quantifier || 'all'; // Default to 'all' if quantifier is missing
      return `childTasks ${quantifier} (${condition.field} ${condition.operator} '${condition.value}')`;
    }
    if (condition.operator === 'exists') {
      return `fields['${condition.field}'] exists`;
    }
    return `fields['${condition.field}'] ${condition.operator} '${condition.value}'`;
  }

  return group.conditions
    .map((condition, index) => {
      let str = '';
      if (condition.conditionType === 'childTasks') {
        const quantifier = condition.quantifier || 'all'; // Default to 'all' if quantifier is missing
        str = `childTasks ${quantifier} (${condition.field} ${condition.operator} '${condition.value}')`;
      } else if (condition.operator === 'exists') {
        str = `fields['${condition.field}'] exists`;
      } else {
        str = `fields['${condition.field}'] ${condition.operator} '${condition.value}'`;
      }

      if (index < group.operators.length) {
        str = str + ` ${group.operators[index]} `;
      }
      return str;
    })
    .join('');
};

const GuardConditionNode: React.FC<{
  condition: GuardCondition;
  onChange: (updated: GuardCondition) => void;
  onDelete: () => void;
  showDelete?: boolean;
}> = ({ condition, onChange, onDelete, showDelete = true }) => {
  return (
    <div className="flex items-start space-x-2 rounded-md border bg-white p-2">
      <div className="flex-grow space-y-2">
        <div className="flex items-center space-x-2">
          <Select
            value={condition.conditionType}
            onValueChange={(value: 'field' | 'childTasks') =>
              onChange({
                ...condition,
                conditionType: value,
                ...(value === 'childTasks' &&
                  !condition.quantifier && { quantifier: 'all' }),
              })
            }
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white">
              <SelectItem value="field">Field</SelectItem>
              <SelectItem value="childTasks">Child Tasks</SelectItem>
            </SelectContent>
          </Select>

          {condition.conditionType === 'childTasks' && (
            <Select
              value={condition.quantifier || 'all'}
              onValueChange={(value: Quantifier) =>
                onChange({ ...condition, quantifier: value })
              }
            >
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="any">Any</SelectItem>
                <SelectItem value="none">None</SelectItem>
              </SelectContent>
            </Select>
          )}

          <Input
            value={condition.field}
            onChange={(e) => onChange({ ...condition, field: e.target.value })}
            placeholder={
              condition.conditionType === 'field' ? 'Field name' : 'state'
            }
            className="w-[150px]"
          />

          <Select
            value={condition.operator}
            onValueChange={(value: Operator) =>
              onChange({ ...condition, operator: value })
            }
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white">
              <SelectItem value="exists">exists</SelectItem>
              <SelectItem value="eq">equals</SelectItem>
              <SelectItem value="neq">not equals</SelectItem>
              <SelectItem value="gt">greater than</SelectItem>
              <SelectItem value="lt">less than</SelectItem>
              <SelectItem value="gte">greater than or equal</SelectItem>
              <SelectItem value="lte">less than or equal</SelectItem>
              <SelectItem value="in">in</SelectItem>
              <SelectItem value="not in">not in</SelectItem>
              <SelectItem value="starts with">starts with</SelectItem>
            </SelectContent>
          </Select>

          {condition.operator !== 'exists' && (
            <Input
              value={condition.value || ''}
              onChange={(e) =>
                onChange({ ...condition, value: e.target.value })
              }
              placeholder="Value"
              className="w-[150px]"
            />
          )}
        </div>
      </div>
      {showDelete && (
        <Button variant="ghost" size="icon" onClick={onDelete} className="mt-1">
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};

const GuardGroupNode: React.FC<{
  group: GuardGroup;
  onChange: (updated: GuardGroup) => void;
}> = ({ group, onChange }) => {
  const handleAddCondition = () => {
    const newCondition: GuardCondition = {
      id: generateId(),
      type: 'condition',
      conditionType: 'field',
      field: '',
      operator: 'exists',
    };

    onChange({
      ...group,
      conditions: [...group.conditions, newCondition],
      operators: [...group.operators, 'and'], // Add default AND operator
    });
  };

  const handleConditionChange = (index: number, updated: GuardCondition) => {
    const newConditions = [...group.conditions];
    newConditions[index] = updated;
    onChange({ ...group, conditions: newConditions });
  };

  const handleOperatorChange = (index: number, operator: LogicalOperator) => {
    const newOperators = [...group.operators];
    newOperators[index] = operator;
    onChange({ ...group, operators: newOperators });
  };

  const handleConditionDelete = (index: number) => {
    const newConditions = group.conditions.filter((_, i) => i !== index);
    const newOperators = group.operators.filter(
      (_, i) => i !== (index < group.operators.length ? index : index - 1)
    );
    onChange({ ...group, conditions: newConditions, operators: newOperators });
  };

  return (
    <div className="space-y-4">
      {group.conditions.map((condition, index) => (
        <div key={condition.id}>
          <GuardConditionNode
            condition={condition}
            onChange={(updated) => handleConditionChange(index, updated)}
            onDelete={() => handleConditionDelete(index)}
            showDelete={group.conditions.length > 1}
          />
          {index < group.conditions.length - 1 && (
            <div className="my-2 flex justify-start">
              <Select
                value={group.operators[index]}
                onValueChange={(value: LogicalOperator) =>
                  handleOperatorChange(index, value)
                }
              >
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="and">AND</SelectItem>
                  <SelectItem value="or">OR</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      ))}

      {group.conditions.length < 4 && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleAddCondition}
          className="w-full text-xs"
        >
          <Plus className="mr-1 h-3 w-3" />
          Add Condition
        </Button>
      )}
    </div>
  );
};

// New component to show a simplified preview of the guard
const GuardPreview: React.FC<{ guard: string }> = ({ guard }) => {
  // Helper to simplify the guard display
  const simplifyGuard = (guard: string): string => {
    if (!guard) return '';
    if (guard.length <= 40) return guard;

    // Special handling for childTasks guards
    const childTasksMatch = guard.match(
      /childTasks\s+(all|any|none)\s+\((\w+)\s+(\w+)\s+'([^']+)'\)/
    );
    if (childTasksMatch) {
      const [, quantifier, field, operator, value] = childTasksMatch;
      return `childTasks ${quantifier} (${field} ${operator} '${value}')`;
    }

    // Count the number of conditions by counting 'and'/'or' occurrences
    const conditions = guard.split(/ and | or /).length;
    return `${conditions} condition${conditions > 1 ? 's' : ''}`;
  };

  return (
    <div className="flex items-center space-x-2 text-sm text-gray-600">
      <Shield className="h-4 w-4 text-red-500" />
      <span>{simplifyGuard(guard)}</span>
    </div>
  );
};

export function GuardComposer({ value, onChange }: GuardComposerProps) {
  const [guardTree, setGuardTree] = React.useState<GuardGroup>(() =>
    parseGuardString(value)
  );
  const [isOpen, setIsOpen] = React.useState(false);
  const [tempGuardTree, setTempGuardTree] = React.useState<GuardGroup | null>(
    null
  );

  const handleChange = (updated: GuardGroup) => {
    setTempGuardTree(updated);
  };

  const handleSave = () => {
    if (tempGuardTree) {
      setGuardTree(tempGuardTree);
      onChange(buildGuardString(tempGuardTree));
      setIsOpen(false);
    }
  };

  const handleOpen = () => {
    setTempGuardTree(guardTree);
    setIsOpen(true);
  };

  const handleClose = () => {
    setTempGuardTree(null);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <div className="cursor-pointer" onClick={handleOpen}>
          {value ? (
            <GuardPreview guard={value} />
          ) : (
            <Button variant="outline" size="sm" className="w-full">
              <Plus className="mr-2 h-4 w-4" />
              Add Guard
            </Button>
          )}
        </div>
      </DialogTrigger>

      <DialogContent className="max-h-[80vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Compose Guard</DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <GuardGroupNode
            group={tempGuardTree || guardTree}
            onChange={handleChange}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Guard</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
