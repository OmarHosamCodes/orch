import {
  createWorkspaceCourseRoadmapCourse,
  createWorkspaceCourseRoadmapLesson,
  createWorkspaceCourseRoadmapOutcome,
  getCourseRoadmapCourseProgress,
  getCourseRoadmapSummary,
  workspaceCourseStatusLabels,
  type WorkspaceCourseRoadmapBlock,
  type WorkspaceCourseStatus,
} from "@orch/workspace";
import { Check, Plus, Trash2 } from "lucide-react";
import { useMemo } from "react";

import type { WorkspaceBlockEditorProps } from "@/features/workspace/node/block-editor-props";
import { BlockProgressBar } from "@/features/workspace/node/blocks/shared/block-progress-bar";
import { useWorkspaceNodeEditorContext } from "@/features/workspace/node/context";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { cn } from "@/lib/utils";

const statusOptions: WorkspaceCourseStatus[] = ["planning", "in-progress"];

function getCourseClasses(status: WorkspaceCourseStatus) {
  return status === "in-progress" ? "border-primary/20 bg-primary/5" : "border-muted bg-muted";
}

export function WorkspaceCourseRoadmapBlockEditor({
  block,
  tabId,
}: WorkspaceBlockEditorProps<WorkspaceCourseRoadmapBlock>) {
  const { mutateTypedBlock } = useWorkspaceNodeEditorContext();

  const summary = useMemo(() => getCourseRoadmapSummary(block), [block]);

  function mutateCourse(
    courseId: string,
    mutator: (course: WorkspaceCourseRoadmapBlock["courses"][number]) => void,
  ) {
    mutateTypedBlock(tabId, block.id, "course-roadmap", (entry) => {
      const course = entry.courses.find((candidate) => candidate.id === courseId);
      if (!course) {
        return;
      }
      mutator(course);
    });
  }

  function addCourse() {
    mutateTypedBlock(tabId, block.id, "course-roadmap", (entry) => {
      entry.courses.push(
        createWorkspaceCourseRoadmapCourse({
          name: "New course",
          outcomes: [
            createWorkspaceCourseRoadmapOutcome({
              text: "Learning outcome",
            }),
          ],
        }),
      );
    });
  }

  function removeCourse(courseId: string) {
    mutateTypedBlock(tabId, block.id, "course-roadmap", (entry) => {
      entry.courses = entry.courses.filter((course) => course.id !== courseId);
    });
  }

  function addLesson(courseId: string) {
    mutateCourse(courseId, (course) => {
      course.lessons.push(
        createWorkspaceCourseRoadmapLesson({
          title: `Lesson ${course.lessons.length + 1}`,
        }),
      );
    });
  }

  function removeLesson(courseId: string, lessonId: string) {
    mutateCourse(courseId, (course) => {
      course.lessons = course.lessons.filter((lesson) => lesson.id !== lessonId);
    });
  }

  function toggleLesson(courseId: string, lessonId: string) {
    mutateCourse(courseId, (course) => {
      const lesson = course.lessons.find((entry) => entry.id === lessonId);
      if (!lesson) {
        return;
      }
      lesson.recorded = !lesson.recorded;
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-muted-foreground">
          {summary.courseCount} courses · {summary.recordedLessons}/{summary.lessonCount} recorded ·{" "}
          {summary.averageCompletionPercent}% average · {summary.inProgressCount} active
        </p>
        <BlockProgressBar
          className="min-w-24 max-w-48 flex-1"
          value={summary.recordedLessons}
          max={Math.max(summary.lessonCount, 1)}
        />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="ml-auto rounded-full"
          aria-label="Add course roadmap course"
          onClick={addCourse}
        >
          <Plus />
          Add course
        </Button>
      </div>

      {block.courses.length === 0 ? (
        <div className="rounded-xl border border-dashed border-muted bg-background py-12 text-center">
          <p className="text-sm text-muted-foreground">Add course</p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-3"
            aria-label="Add course roadmap course"
            onClick={addCourse}
          >
            <Plus />
            Add course
          </Button>
        </div>
      ) : (
        <div className="space-y-5">
          {block.courses.map((course) => {
            const progress = getCourseRoadmapCourseProgress(course);

            return (
              <article
                key={course.id}
                className={cn("rounded-surface border p-surface", getCourseClasses(course.status))}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <Input
                        value={course.name}
                        placeholder="Course name"
                        className="min-w-56 flex-1 border-0 bg-transparent px-0 text-lg font-bold shadow-none focus-visible:ring-0"
                        onChange={(event) =>
                          mutateCourse(course.id, (entry) => {
                            entry.name = event.target.value.slice(0, 120);
                          })
                        }
                      />

                      <div className="flex flex-wrap gap-2">
                        {statusOptions.map((status) => (
                          <Button
                            key={`${course.id}-${status}`}
                            type="button"
                            size="sm"
                            variant={course.status === status ? "secondary" : "outline"}
                            className="rounded-full px-4"
                            aria-label={`Set ${course.name || "course"} status to ${workspaceCourseStatusLabels[status]}`}
                            onClick={() =>
                              mutateCourse(course.id, (entry) => {
                                entry.status = status;
                              })
                            }
                          >
                            {workspaceCourseStatusLabels[status]}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary" className="rounded-2xl">
                        {progress.recordedLessons}/{progress.lessonCount} recorded
                      </Badge>
                      <Badge variant="secondary" className="rounded-2xl">
                        {progress.completionPercent}% complete
                      </Badge>
                      <Badge variant="secondary" className="rounded-2xl">
                        {course.outcomes.length} outcomes
                      </Badge>
                    </div>

                    <BlockProgressBar
                      value={progress.recordedLessons}
                      max={Math.max(progress.lessonCount, 1)}
                    />
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    className="rounded-2xl hover:bg-destructive/10 hover:text-destructive"
                    aria-label={`Remove ${course.name || "course"}`}
                    onClick={() => removeCourse(course.id)}
                  >
                    <Trash2 />
                  </Button>
                </div>

                <div className="mt-5 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-toned">
                      Lesson Flow
                    </p>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="rounded-full"
                      onClick={() => addLesson(course.id)}
                    >
                      <Plus />
                      Add Lesson
                    </Button>
                  </div>

                  <div className="grid gap-3 xl:grid-cols-2">
                    {course.lessons.map((lesson, lessonIndex) => (
                      <div
                        key={`${course.id}-${lesson.id}-editor`}
                        className="flex items-center gap-3 rounded-2xl border border-muted bg-background px-3 py-3"
                      >
                        <Button
                          type="button"
                          size="sm"
                          variant={lesson.recorded ? "secondary" : "outline"}
                          className={cn(
                            "rounded-full",
                            lesson.recorded &&
                              "border-success/40 bg-success/10 text-success hover:bg-success/15",
                          )}
                          onClick={() => toggleLesson(course.id, lesson.id)}
                        >
                          {lesson.recorded ? "Recorded" : "Pending"}
                        </Button>

                        <Input
                          value={lesson.title}
                          placeholder="Lesson title"
                          className="flex-1 rounded-2xl"
                          onChange={(event) =>
                            mutateCourse(course.id, (entry) => {
                              const target = entry.lessons.find(
                                (candidate) => candidate.id === lesson.id,
                              );
                              if (!target) {
                                return;
                              }
                              target.title = event.target.value.slice(0, 120);
                            })
                          }
                        />

                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-toned">
                          {lessonIndex + 1}
                        </span>

                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="rounded-lg hover:bg-destructive/10 hover:text-destructive"
                          aria-label={`Remove ${lesson.title || `Lesson ${lessonIndex + 1}`}`}
                          onClick={() => removeLesson(course.id, lesson.id)}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-toned">
                      Learning Outcomes
                    </p>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="rounded-full"
                      onClick={() =>
                        mutateCourse(course.id, (entry) => {
                          entry.outcomes.push(
                            createWorkspaceCourseRoadmapOutcome({
                              text: "New learning outcome",
                            }),
                          );
                        })
                      }
                    >
                      <Plus />
                      Add Outcome
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {course.outcomes.map((outcome) => (
                      <div
                        key={outcome.id}
                        className="flex items-start gap-3 rounded-2xl border border-muted bg-background px-3 py-3"
                      >
                        <div className="mt-1 flex size-7 shrink-0 items-center justify-center rounded-full bg-success/10 text-success">
                          <Check className="size-4" />
                        </div>

                        <Input
                          value={outcome.text}
                          placeholder="Expected learning outcome"
                          className="flex-1 rounded-2xl"
                          onChange={(event) =>
                            mutateCourse(course.id, (entry) => {
                              const target = entry.outcomes.find(
                                (candidate) => candidate.id === outcome.id,
                              );
                              if (!target) {
                                return;
                              }
                              target.text = event.target.value.slice(0, 200);
                            })
                          }
                        />

                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="rounded-lg hover:bg-destructive/10 hover:text-destructive"
                          aria-label={`Remove ${outcome.text || "learning outcome"}`}
                          onClick={() =>
                            mutateCourse(course.id, (entry) => {
                              entry.outcomes = entry.outcomes.filter(
                                (candidate) => candidate.id !== outcome.id,
                              );
                            })
                          }
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
