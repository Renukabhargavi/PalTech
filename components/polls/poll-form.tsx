"use client";

import { useEffect, useMemo, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createPollSchema, CreatePollInput } from "@/lib/validators/poll.schema";
import { createPoll, PollTemplate, updateDraftPoll } from "@/lib/actions/poll.actions";
import { useRouter } from "next/navigation";
import { Clock3, Plus, Sparkles, Trash2 } from "lucide-react";

type PollFormProps = {
  draftPollId?: string;
  initialData?: Partial<CreatePollInput>;
  recentPolls?: PollTemplate[];
};

function toDatetimeLocalValue(value?: string) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const offset = date.getTimezoneOffset();
  const adjusted = new Date(date.getTime() - offset * 60_000);
  return adjusted.toISOString().slice(0, 16);
}

function buildDefaultValues(initialData?: Partial<CreatePollInput>): CreatePollInput {
  return {
    title: initialData?.title || "",
    description: initialData?.description || "",
    type: initialData?.type || "single",
    visibility: initialData?.visibility || "public",
    resultsVisibility: initialData?.resultsVisibility || "always",
    options: initialData?.options?.length ? initialData.options : [{ label: "" }, { label: "" }],
    allowedEmails: [],
    endAt: initialData?.endAt ? toDatetimeLocalValue(initialData.endAt) : "",
  };
}

export default function PollForm({ draftPollId, initialData, recentPolls = [] }: PollFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const router = useRouter();

  const defaultValues = useMemo(() => buildDefaultValues(initialData), [initialData]);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CreatePollInput>({
    resolver: zodResolver(createPollSchema),
    defaultValues,
  });

  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  const { fields, append, remove, replace } = useFieldArray({
    control,
    name: "options",
  });

  const applyTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId);

    if (!templateId) {
      reset(defaultValues);
      return;
    }

    const template = recentPolls.find((poll) => poll.id === templateId);
    if (!template) return;

    const nextValues = buildDefaultValues({
      title: template.title,
      description: template.description || "",
      type: template.type,
      visibility: template.visibility,
      resultsVisibility: template.resultsVisibility,
      options: template.options.length ? template.options : [{ label: "" }, { label: "" }],
      endAt: template.endAt || "",
    });

    reset(nextValues);
    replace(nextValues.options);
  };

  const onSubmit = async (data: CreatePollInput) => {
    setIsLoading(true);
    setError(null);

    try {
      const cleanData: CreatePollInput = {
        ...data,
        title: data.title.trim(),
        description: data.description?.trim() || "",
        options: data.options.map((option) => ({ label: option.label.trim() })),
        allowedEmails: [],
        endAt: data.endAt || "",
      };

      if (draftPollId) {
        await updateDraftPoll(draftPollId, cleanData);
        router.refresh();
      } else {
        const res = await createPoll(cleanData);
        if (res.success) {
          router.push(`/my-polls/${res.pollId}/edit`);
        }
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Something went wrong.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {recentPolls.length > 0 && (
        <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-full bg-white p-2 text-blue-600 shadow-sm">
              <Sparkles size={16} />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-semibold text-gray-800 mb-1">
                Start from a recent poll
              </label>
              <p className="text-xs text-gray-600 mb-3">
                Pick a recent poll to auto-fill this form with its title, description, options, poll type, visibility, and results settings.
              </p>
              <select
                value={selectedTemplateId}
                onChange={(event) => applyTemplate(event.target.value)}
                className="w-full border border-blue-200 rounded-md px-4 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none bg-white shadow-sm"
              >
                <option value="">Create from scratch</option>
                {recentPolls.map((poll) => (
                  <option key={poll.id} value={poll.id}>
                    {poll.title} {poll.updatedAt ? `· ${new Date(poll.updatedAt).toLocaleDateString()}` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm border border-red-200">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">Poll Title</label>
        <input
          {...register("title")}
          className="w-full border border-gray-300 rounded-md px-4 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none bg-white shadow-sm"
          placeholder="What should the team decide next?"
        />
        {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">Description (Optional)</label>
        <textarea
          {...register("description")}
          className="w-full border border-gray-300 rounded-md px-4 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none h-20 bg-white shadow-sm resize-none"
          placeholder="Add more context..."
        />
        {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description.message}</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Poll Type</label>
          <select
            {...register("type")}
            className="w-full border border-gray-300 rounded-md px-4 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none bg-white shadow-sm"
          >
            <option value="single">Single Choice (Radio)</option>
            <option value="multi">Multiple Choice (Checkboxes)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Visibility</label>
          <select
            {...register("visibility")}
            className="w-full border border-gray-300 rounded-md px-4 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none bg-white shadow-sm"
          >
            <option value="public">Public (Anyone with link)</option>
            <option value="private">Private (Invite only)</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">Results Visibility</label>
        <select
          {...register("resultsVisibility")}
          className="w-full border border-gray-300 rounded-md px-4 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none bg-white shadow-sm"
        >
          <option value="always">Always visible to viewers with access</option>
          <option value="after_voting">Visible only after a viewer votes</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">Poll Expiry (Optional)</label>
        <div className="relative">
          <input
            type="datetime-local"
            {...register("endAt")}
            className="w-full border border-gray-300 rounded-md px-4 py-2 pl-11 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none bg-white shadow-sm"
          />
          <Clock3 size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
        </div>
        <p className="text-xs text-gray-500 mt-1">Leave empty if the poll never expires.</p>
        {errors.endAt && <p className="text-red-500 text-xs mt-1">{errors.endAt.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Options</label>
        {fields.map((field, index) => (
          <div key={field.id} className="flex gap-2 mb-3 items-start">
            <div className="flex-1">
              <input
                {...register(`options.${index}.label` as const)}
                className="w-full border border-gray-300 rounded-md px-4 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none bg-white shadow-sm"
                placeholder={`Option ${index + 1}`}
              />
              {errors.options?.[index]?.label && (
                <p className="text-red-500 text-xs mt-1">{errors.options[index]?.label?.message}</p>
              )}
            </div>
            {fields.length > 2 && (
              <button
                type="button"
                onClick={() => remove(index)}
                className="p-2 text-red-500 hover:bg-red-50 border border-transparent rounded-md"
              >
                <Trash2 size={18} />
              </button>
            )}
          </div>
        ))}
        {errors.options && !Array.isArray(errors.options) && "message" in errors.options && (
          <p className="text-red-500 text-xs mt-1">{errors.options.message}</p>
        )}
        <button
          type="button"
          onClick={() => append({ label: "" })}
          className="mt-2 flex items-center text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          <Plus size={16} className="mr-1" /> Add Option
        </button>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-blue-600 text-white py-2 rounded-md font-medium hover:bg-blue-700 transition disabled:opacity-50"
      >
        {isLoading ? (draftPollId ? "Saving Draft..." : "Creating Poll...") : draftPollId ? "Save Draft Changes" : "Create Poll Draft"}
      </button>
    </form>
  );
}
