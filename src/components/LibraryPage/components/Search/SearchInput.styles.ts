import { TextField } from "@mui/material";
import { styled } from "@mui/material/styles";

export const StyledTextField = styled(TextField)(({ theme }) => {
  return `
      .MuiInputBase-input {
        background-color: ${
          theme.palette?.mode === "dark"
            ? "rgba(255, 255, 255, 0.15)"
            : undefined
        };
        color: ${theme.palette?.mode === "dark" ? "#fff" : undefined};
        &::placeholder {
          color: ${
            theme.palette?.mode === "dark"
              ? "rgba(255, 255, 255, 0.5)"
              : undefined
          };
        }
      }
    `;
});
