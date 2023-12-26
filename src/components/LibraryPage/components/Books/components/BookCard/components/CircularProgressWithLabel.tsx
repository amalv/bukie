import styled from "@emotion/styled";
import {
  Box,
  CircularProgress,
  CircularProgressProps,
  Typography,
} from "@mui/material";

const CircularProgressWrapper = styled.div`
  flex: 0 0 50px; // This reserves a fixed width of 50px for the CircularProgressWithLabel
`;

export const CircularProgressWithLabel = (
  props: CircularProgressProps & { value: number }
) => {
  let color: CircularProgressProps["color"] = "error";
  if (props.value >= 70) {
    color = "success";
  } else if (props.value >= 40) {
    color = "warning";
  }

  return (
    <CircularProgressWrapper>
      <Box
        display="flex"
        alignItems="center"
        justifyContent="center"
        position="relative"
      >
        <CircularProgress
          variant="determinate"
          {...props}
          value={props.value}
          color={color}
        />
        <Box
          display="flex"
          alignItems="center"
          justifyContent="center"
          position="absolute"
          top={0}
          bottom={0}
          left={0}
          right={0}
        >
          <Typography variant="caption" component="div" color="text.secondary">
            {`${Math.round(props.value)}%`}
          </Typography>
        </Box>
      </Box>
    </CircularProgressWrapper>
  );
};
