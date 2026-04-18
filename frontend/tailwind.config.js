export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#ffffff",
        paper: "#0a0a0a",
        line: "#333333",
        teal: "#ff4500", // Signal Orange
        coral: "#ff0033", // Harsh Red
        honey: "#ffaa00", // Alert Yellow
        leaf: "#ccff00"  // Acid Green
      },
      boxShadow: {
        panel: "4px 4px 0px 0px rgba(255, 69, 0, 1)" // Solid sharp orange shadow
      }
    }
  },
  plugins: []
};
