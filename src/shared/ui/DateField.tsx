import { lazy, Suspense, type ComponentProps } from "react";
import { TextField } from "./index";

const DateFieldPicker = lazy(() => import("./DateFieldPicker"));

type Props = ComponentProps<typeof DateFieldPicker>;

export default function DateField(props: Props) {
  return (
    <Suspense
      fallback={
        <div className="field date-field" aria-busy="true">
          <label>
            {props.label}
            <TextField.Root aria-label={props.label} value={props.value} disabled readOnly />
          </label>
        </div>
      }
    >
      <DateFieldPicker {...props} />
    </Suspense>
  );
}
