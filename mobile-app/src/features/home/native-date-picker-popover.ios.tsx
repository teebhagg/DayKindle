import { useTheme } from '@/hooks/use-theme';
import { colorWithOpacity } from '@/constants/theme';
import { useContext, useState } from 'react';
import { Button, DatePicker, Host, HStack, Image, Popover, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import { accessibilityLabel, background, buttonStyle, datePickerStyle, font, foregroundStyle, frame, padding, shapes, strokeBorder, tint } from '@expo/ui/swift-ui/modifiers';
import { EXPRESSIVE_FONT_SIZE_MULTIPLIER, nativeFontFamilyForVisualStyle, VisualStyleContext } from './visual-style-context';
import type { DatePickerPopoverProps } from './native-date-picker-popover.types';



export default function NativeDatePickerPopover({ value, minimumDate, displayValue, isPlaceholder, title, accessibilityLabel: accessibleLabel, onChange }: DatePickerPopoverProps) {
  const palette = useTheme();
  const colors = palette;
  const [isPresented, setIsPresented] = useState(false);
  const visualStyle = useContext(VisualStyleContext);
  const fontSize = visualStyle === 'expressive' ? 15.4 * 1.2 * EXPRESSIVE_FONT_SIZE_MULTIPLIER : 15.4;
  return (
    <Host style={{ flex: 1, minHeight: 54 }}>
      <Popover
        isPresented={isPresented}
        onIsPresentedChange={setIsPresented}
        attachmentAnchor="bottom"
        arrowEdge="none"
      >
        <Popover.Trigger>
          <Button
            onPress={() => setIsPresented(true)}
            modifiers={[
              buttonStyle('plain'),
              frame({ maxWidth: 10000, minHeight: 54, alignment: 'leading' }),
              accessibilityLabel(accessibleLabel),
            ]}
          >
            <HStack
              spacing={10}
              alignment="center"
              modifiers={[
                frame({ maxWidth: 10000, minHeight: 54, alignment: 'leading' }),
                padding({ horizontal: 15 }),
                background(colors.surface, shapes.roundedRectangle({ cornerRadius: 17 })),
                strokeBorder({ content: colors.line, shape: 'roundedRectangle', cornerRadius: 17 }),
              ]}
            >
              <Text modifiers={[font({ family: nativeFontFamilyForVisualStyle(visualStyle), size: fontSize }), foregroundStyle(isPlaceholder ? colorWithOpacity(colors.ink, 0.5) : colors.ink)]}>
                {displayValue}
              </Text>
              <Spacer />
              <Image systemName="calendar" size={18} color={colors.green} />
            </HStack>
          </Button>
        </Popover.Trigger>
        <Popover.Content>
          <VStack modifiers={[padding({ all: 12 }), frame({ width: 320 })]}>
            <DatePicker
              title={title}
              selection={value}
              range={minimumDate ? { start: minimumDate } : undefined}
              displayedComponents={['date']}
              onDateChange={(selectedDate) => {
                onChange(selectedDate);
                setIsPresented(false);
              }}
              modifiers={[datePickerStyle('graphical'), tint(colors.green)]}
            />
          </VStack>
        </Popover.Content>
      </Popover>
    </Host>
  );
}
