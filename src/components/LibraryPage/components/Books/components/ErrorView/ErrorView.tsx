import type { ApolloError } from "@apollo/client";
import type { SnackbarCloseReason } from "@mui/material";

import { ErrorSnackbar } from "../../../../../shared";
import { Message } from "../Message";

const useErrorMessage = (error: ApolloError | undefined) =>
  error?.message ||
  error?.networkError?.message ||
  "An unexpected error occurred";

export const ErrorView = ({
  error,
  isErrorSnackbarOpen,
  handleCloseSnackbar,
}: {
  error: ApolloError;
  isErrorSnackbarOpen: boolean;
  handleCloseSnackbar: (
    _: React.SyntheticEvent | Event,
    reason?: SnackbarCloseReason,
  ) => void;
}) => {
  const errorMessage = useErrorMessage(error);

  return (
    <>
      <ErrorSnackbar
        open={isErrorSnackbarOpen}
        handleClose={handleCloseSnackbar}
        errorMessage={errorMessage}
      />
      <Message text={errorMessage} />
    </>
  );
};
