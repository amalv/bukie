import { Snackbar, Alert } from "@mui/material";
import { SnackbarCloseReason } from "@mui/material/Snackbar";
import React from "react";

interface ErrorSnackbarProps {
  open: boolean;
  handleClose: (
    event: React.SyntheticEvent | Event,
    reason?: SnackbarCloseReason
  ) => void;
  errorMessage: string;
}

const SNACKBAR_AUTO_HIDE_DURATION = 6000;

export const ErrorSnackbar: React.FC<ErrorSnackbarProps> = ({
  open,
  handleClose,
  errorMessage,
}) => (
  <Snackbar
    open={open}
    autoHideDuration={SNACKBAR_AUTO_HIDE_DURATION}
    onClose={handleClose}
  >
    <Alert onClose={handleClose} severity="error">
      {errorMessage}
    </Alert>
  </Snackbar>
);
