declare abstract class WorkflowEntrypoint<Env = unknown, Params = unknown> {
  abstract run(event: WorkflowEvent<Params>, step: WorkflowStep): Promise<unknown>;
}

type WorkflowEvent<Params = unknown> = {
  payload: Params;
};

type WorkflowStep = {
  do<T>(name: string, callback: () => Promise<T> | T): Promise<T>;
};
