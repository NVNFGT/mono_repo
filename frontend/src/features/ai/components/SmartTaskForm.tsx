import React, { useState, useEffect, useCallback } from 'react';
import { useDebounce } from '../hooks/useDebounce';
import { useParseTaskMutation, useLazyGetAutocompleteSuggestionsQuery } from '../../../store/api/aiApi';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { Label } from '../../../components/ui/Label';
import type { ParsedTask, TaskSuggestion, SmartTaskFormProps } from '../types';

export default function SmartTaskForm({ 
  initialValue = '', 
  onTaskParsed, 
  onSuggestionApplied,
  className = '' 
}: SmartTaskFormProps) {
  // State management
  const [input, setInput] = useState(initialValue);
  const [parsedTask, setParsedTask] = useState<ParsedTask | null>(null);
  const [suggestions, setSuggestions] = useState<TaskSuggestion[]>([]);
  const [autocompleteSuggestions, setAutocompleteSuggestions] = useState<string[]>([]);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [isParsingEnabled, setIsParsingEnabled] = useState(true);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);

  // Debounced input for API calls
  const debouncedInput = useDebounce(input, 500);

  // API hooks
  const [parseTask, { isLoading: isParsing, error: parseError }] = useParseTaskMutation();
  const [getAutocompleteSuggestions, { isLoading: isLoadingAutocomplete }] = useLazyGetAutocompleteSuggestionsQuery();

  // Parse task when debounced input changes
  useEffect(() => {
    if (debouncedInput.trim().length > 3 && isParsingEnabled) {
      handleParseTask(debouncedInput);
    } else {
      setParsedTask(null);
      setSuggestions([]);
    }
  }, [debouncedInput, isParsingEnabled]);

  // Get autocomplete suggestions
  useEffect(() => {
    if (input.trim().length >= 3 && showAutocomplete) {
      getAutocompleteSuggestions(input.trim())
        .unwrap()
        .then((completions) => {
          setAutocompleteSuggestions(completions);
        })
        .catch((error) => {
          console.warn('Autocomplete failed:', error);
          setAutocompleteSuggestions([]);
        });
    } else {
      setAutocompleteSuggestions([]);
    }
  }, [input, showAutocomplete, getAutocompleteSuggestions]);

  const handleParseTask = useCallback(async (taskInput: string) => {
    try {
      const result = await parseTask({
        input: taskInput,
        context: {
          timestamp: new Date().toISOString(),
          source: 'smart_form'
        }
      }).unwrap();

      setParsedTask(result.parsedTask);
      setSuggestions(result.suggestions || []);
      
      // Notify parent component
      if (onTaskParsed) {
        onTaskParsed(result.parsedTask);
      }
    } catch (error) {
      console.error('Task parsing failed:', error);
      setParsedTask(null);
      setSuggestions([]);
    }
  }, [parseTask, onTaskParsed]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInput(value);
    setSelectedSuggestionIndex(-1);
    
    // Show autocomplete for inputs > 2 characters
    setShowAutocomplete(value.trim().length > 2);
  };

  const handleInputFocus = () => {
    if (input.trim().length > 2) {
      setShowAutocomplete(true);
    }
  };

  const handleInputBlur = () => {
    // Delay hiding to allow for clicks on suggestions
    setTimeout(() => setShowAutocomplete(false), 200);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showAutocomplete || autocompleteSuggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedSuggestionIndex(prev => 
          prev < autocompleteSuggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedSuggestionIndex(prev => 
          prev > 0 ? prev - 1 : autocompleteSuggestions.length - 1
        );
        break;
      case 'Enter':
        if (selectedSuggestionIndex >= 0) {
          e.preventDefault();
          selectAutocompleteSuggestion(autocompleteSuggestions[selectedSuggestionIndex]);
        }
        break;
      case 'Escape':
        setShowAutocomplete(false);
        setSelectedSuggestionIndex(-1);
        break;
    }
  };

  const selectAutocompleteSuggestion = (suggestion: string) => {
    setInput(suggestion);
    setShowAutocomplete(false);
    setSelectedSuggestionIndex(-1);
  };

  const applySuggestion = (suggestion: TaskSuggestion) => {
    // Apply suggestion based on type
    switch (suggestion.type) {
      case 'description':
        // For description suggestions, we might want to append or modify
        break;
      case 'priority':
        // Priority suggestions would be handled by parent
        break;
      case 'due_date':
        // Due date suggestions would be handled by parent
        break;
      default:
        break;
    }

    if (onSuggestionApplied) {
      onSuggestionApplied(suggestion);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.7) return 'text-green-600';
    if (confidence >= 0.4) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className={`smart-task-form ${className}`}>
      {/* Main Input */}
      <div className="relative">
        <Label htmlFor="task-input" className="block text-sm font-medium mb-2">
          Describe your task
        </Label>
        <Input
          id="task-input"
          type="text"
          value={input}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          onKeyDown={handleKeyDown}
          placeholder="e.g., 'Call client about project deadline by Friday'"
          className="w-full"
          disabled={isParsing}
        />
        
        {/* Loading indicator */}
        {isParsing && (
          <div className="absolute right-3 top-9">
            <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
          </div>
        )}

        {/* Autocomplete Dropdown */}
        {showAutocomplete && autocompleteSuggestions.length > 0 && (
          <Card className="absolute z-10 w-full mt-1 max-h-60 overflow-y-auto">
            <div className="p-2">
              {autocompleteSuggestions.map((suggestion, index) => (
                <div
                  key={index}
                  className={`p-2 cursor-pointer rounded hover:bg-gray-100 ${
                    index === selectedSuggestionIndex ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                  }`}
                  onClick={() => selectAutocompleteSuggestion(suggestion)}
                >
                  <span className="text-sm">{suggestion}</span>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* Parse Error */}
      {parseError && (
        <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          Failed to analyze task. AI features may be unavailable.
        </div>
      )}

      {/* Parsed Task Display */}
      {parsedTask && (
        <Card className="mt-4 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">AI Analysis</h3>
            <div className="flex items-center space-x-2">
              <span className={`text-sm ${getConfidenceColor(parsedTask.confidence)}`}>
                {Math.round(parsedTask.confidence * 100)}% confidence
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsParsingEnabled(!isParsingEnabled)}
              >
                {isParsingEnabled ? 'Disable AI' : 'Enable AI'}
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            {/* Title */}
            <div>
              <Label className="text-xs text-gray-500 uppercase tracking-wide">Title</Label>
              <p className="font-medium">{parsedTask.title}</p>
            </div>

            {/* Priority */}
            <div>
              <Label className="text-xs text-gray-500 uppercase tracking-wide">Priority</Label>
              <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(parsedTask.priority)}`}>
                {parsedTask.priority}
              </span>
            </div>

            {/* Category */}
            {parsedTask.category && (
              <div>
                <Label className="text-xs text-gray-500 uppercase tracking-wide">Category</Label>
                <span className="inline-block px-2 py-1 bg-blue-50 text-blue-700 rounded text-sm">
                  {parsedTask.category}
                </span>
              </div>
            )}

            {/* Due Date */}
            {parsedTask.dueDate && (
              <div>
                <Label className="text-xs text-gray-500 uppercase tracking-wide">Suggested Due Date</Label>
                <p className="text-sm">{parsedTask.dueDate}</p>
              </div>
            )}

            {/* Description */}
            {parsedTask.description && (
              <div>
                <Label className="text-xs text-gray-500 uppercase tracking-wide">Description</Label>
                <p className="text-sm text-gray-700">{parsedTask.description}</p>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* AI Suggestions */}
      {suggestions.length > 0 && (
        <Card className="mt-4 p-4">
          <h3 className="font-semibold text-gray-900 mb-3">💡 AI Suggestions</h3>
          <div className="space-y-3">
            {suggestions.map((suggestion, index) => (
              <div key={suggestion.id || index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-xs font-medium text-gray-500 uppercase">
                      {suggestion.type.replace('_', ' ')}
                    </span>
                    <span className={`text-xs ${getConfidenceColor(suggestion.confidence)}`}>
                      {Math.round(suggestion.confidence * 100)}%
                    </span>
                  </div>
                  <p className="text-sm font-medium text-gray-900 mb-1">
                    {suggestion.suggestion}
                  </p>
                  <p className="text-xs text-gray-600">
                    {suggestion.reasoning}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => applySuggestion(suggestion)}
                  className="flex-shrink-0"
                >
                  Apply
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}