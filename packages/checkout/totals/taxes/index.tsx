/**
 * External dependencies
 */
import classnames from 'classnames';
import { __ } from '@wordpress/i18n';
import { getSetting } from '@woocommerce/settings';
import type { Currency } from '@woocommerce/price-format';
import type { CartTotalsTaxLineItem } from '@woocommerce/type-defs/cart';
import { ReactElement } from 'react';

/**
 * Internal dependencies
 */
import TotalsItem from '../item';
import './style.scss';

interface Values {
	// eslint-disable-next-line camelcase
	tax_lines: CartTotalsTaxLineItem[];
	// eslint-disable-next-line camelcase
	total_tax: string;
}

interface TotalsTaxesProps {
	className?: string;
	currency: Currency;
	showRateAfterTaxName: boolean;
	values: Values | Record< string, never >;
}

const TotalsTaxes = ( {
	currency,
	values,
	className,
	showRateAfterTaxName,
}: TotalsTaxesProps ): ReactElement | null => {
	const { total_tax: totalTax, tax_lines: taxLines } = values;

	if ( ! getSetting( 'taxesEnabled', true ) ) {
		return null;
	}

	const itemisedTaxItems: ReactElement | null = getSetting(
		'displayItemizedTaxes',
		false
	) ? (
		<>
			{ taxLines.map( ( { name, rate }, i ) => {
				const label = `${ name }${
					showRateAfterTaxName ? ` ${ rate }` : ''
				}`;
				return (
					<TotalsItem
						key={ `tax-line-${ i }` }
						className="wc-block-components-totals-taxes__tax-line"
						currency={ currency }
						label={ label }
						value={ null }
					/>
				);
			} ) }{ ' ' }
		</>
	) : null;

	return (
		<>
			<TotalsItem
				className={ classnames(
					'wc-block-components-totals-taxes',
					className
				) }
				currency={ currency }
				label={ __( 'Taxes', 'woo-gutenberg-products-block' ) }
				value={ parseInt( totalTax, 10 ) }
				description={ itemisedTaxItems }
			/>
		</>
	);
};

export default TotalsTaxes;
