import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Checkbox } from "@/components/ui/Checkbox";
import { Radio } from "@/components/ui/Radio";

describe("styled Checkbox / Radio", () => {
  it("keeps native semantics: label click toggles, role and checked state are exposed", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Checkbox label="Dosen" checked={false} onChange={onChange} />);
    const box = screen.getByRole("checkbox", { name: "Dosen" });
    expect(box).not.toBeChecked();
    await user.click(screen.getByText("Dosen"));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("is keyboard operable (Space) and respects disabled", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { rerender } = render(<Checkbox label="Admin" checked={false} onChange={onChange} />);
    await user.tab();
    expect(screen.getByRole("checkbox", { name: "Admin" })).toHaveFocus();
    await user.keyboard(" ");
    expect(onChange).toHaveBeenCalledTimes(1);
    rerender(<Checkbox label="Admin" checked={false} disabled onChange={onChange} />);
    await user.click(screen.getByText("Admin"));
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("radio selects once and exposes checked state", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <>
        <Radio name="jenis" label="Tautan" checked onChange={() => {}} />
        <Radio name="jenis" label="Grup" checked={false} onChange={onChange} />
      </>,
    );
    expect(screen.getByRole("radio", { name: "Tautan" })).toBeChecked();
    await user.click(screen.getByText("Grup"));
    expect(onChange).toHaveBeenCalled();
  });
});
