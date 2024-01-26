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

const determineColor = (value: number): CircularProgressProps["color"] => {
  if (value >= 70) {
    return "success";
  } else if (value >= 40) {
    return "warning";
  }
  return "error";
};

const CircularProgressLabel = ({ value }: { value: number }) => (
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
      {`${Math.round(value)}%`}
    </Typography>
  </Box>
);
export const CircularProgressWithLabel = (
  props: CircularProgressProps & { value: number },
) => {
  const color = determineColor(props.value);

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
        <CircularProgressLabel value={props.value} />
      </Box>
    </CircularProgressWrapper>
  );
};
