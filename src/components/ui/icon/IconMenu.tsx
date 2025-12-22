interface Props {
	className?: string;
	size?: number;
}

export function IconMenu({ className, size = 24 }: Props) {
	return (
		<div className={className}>
			<svg
				height={size}
				width={size}
				className={`w-[${size}px] h-[${size}px]`}
				viewBox="0 0 24 24"
				fill="currentColor"
				xmlns="http://www.w3.org/2000/svg"
			>
				<path d="M18.625 7.875C18.8125 7.875 19 7.71875 19 7.5V6.5C19 6.3125 18.8125 6.125 18.625 6.125H5.375C5.15625 6.125 5 6.3125 5 6.5V7.5C5 7.71875 5.15625 7.875 5.375 7.875H18.625ZM18.625 12.875C18.8125 12.875 19 12.7188 19 12.5V11.5C19 11.3125 18.8125 11.125 18.625 11.125H5.375C5.15625 11.125 5 11.3125 5 11.5V12.5C5 12.7188 5.15625 12.875 5.375 12.875H18.625ZM18.625 17.875C18.8125 17.875 19 17.7188 19 17.5V16.5C19 16.3125 18.8125 16.125 18.625 16.125H5.375C5.15625 16.125 5 16.3125 5 16.5V17.5C5 17.7188 5.15625 17.875 5.375 17.875H18.625Z" />
			</svg>
		</div>
	);
}
