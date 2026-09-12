import { render, screen } from "@testing-library/react";
import App from "./App";

test("renders the JPG to PNG converter", () => {
  render(<App />);
  expect(
    screen.getByRole("heading", {
      name: /JPG to PNG Converter/i,
    })
  ).toBeInTheDocument();
});
