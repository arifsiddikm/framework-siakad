import "@testing-library/jest-dom/vitest";

// jsdom has no <dialog> behaviour; emulate open/close so forms inside dialogs are interactive in tests.
HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
  this.setAttribute("open", "");
};
HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
  this.removeAttribute("open");
  this.dispatchEvent(new Event("close"));
};
