"use client";

import { useEffect, useState } from "react";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createPollSchema, CreatePollInput } from "@/lib/validators/poll.schema";
import { createPoll } from "@/lib/actions/poll.actions";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";

export default function PollForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const { register, control, handleSubmit, formState: { errors } } = useForm<CreatePollInput>({
    resolver: zodResolver(createPollSchema),
    defaultValues: {
      type: "single",
      visibility: "public",
      resultsVisibility: "always",
      options: [{ label: "" }, { label: "" }],
      allowedEmails: [],
    }
  });

  const visibility = useWatch({ control, name: "visibility" });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "options",
  });

  const { fields: emailFields, append: appendEmail, remove: removeEmail } = useFieldArray({
    control,
    name: "allowedEmails" as never, // cast to bypass strict typing issue if any, or properly define
  });

  useEffect(() => {
    if (visibility === "private" && emailFields.length === 0) {
      appendEmail("");
    }
  }, [appendEmail, emailFields.length, visibility]);

  const onSubmit = async (data: CreatePollInput) => {
    setIsLoading(true);
    setError(null);
    try {
      // Filter out empty emails
      const cleanData = {
        ...data,
        allowedEmails: data.visibility === "private"
          ? data.allowedEmails?.map((e: string) => e.trim()).filter((e: string) => e !== "") || []
          : [],
      };
      const res = await createPoll(cleanData);
      if (res.success) {
        // Redirect to detail page with an edit/draft view
        router.push(`/my-polls/${res.pollId}/edit`);
      }
    } catch (e: any) {
      setError(e.message || "Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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
          placeholder="What is your favorite..."
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

      <div className="grid grid-cols-2 gap-4">
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

      {visibility === "private" && (
        <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Allowed Emails</label>
          <p className="text-xs text-gray-500 mb-3">Only these emails will be able to access the poll. They must sign in.</p>
          {emailFields.map((field, index) => (
            <div key={field.id} className="flex gap-2 mb-2 items-start">
              <div className="flex-1">
                <input
                  {...register(`allowedEmails.${index}` as const)}
                  className="w-full border border-gray-300 rounded-md px-4 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none bg-white shadow-sm"
                  placeholder="voter@example.com"
                />
                {/* @ts-ignore */}
                {errors.allowedEmails?.[index] && (
                  <p className="text-red-500 text-xs mt-1">Invalid email address</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => removeEmail(index)}
                className="p-2 text-red-500 hover:bg-red-50 border border-transparent rounded-md"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => appendEmail("")}
            className="mt-2 flex items-center text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            <Plus size={16} className="mr-1" /> Add Email
          </button>
        </div>
      )}

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">Results Visibility</label>
        <select 
          {...register("resultsVisibility")} 
          className="w-full border border-gray-300 rounded-md px-4 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none bg-white shadow-sm"
        >
          <option value="always">Always show results after vote</option>
          <option value="after_voting">Only show after poll is closed / you vote</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">Poll Expiry (Optional)</label>
        <input 
          type="datetime-local"
          {...register("endAt")} 
          className="w-full border border-gray-300 rounded-md px-4 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none bg-white shadow-sm"
        />
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
        {errors.options && !errors.options.root && (
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
        {isLoading ? "Creating Poll..." : "Create Poll Draft"}
      </button>
    </form>
  );
}
