/**
 * External dependencies
 */
import classnames from 'classnames';
import { __ } from '@wordpress/i18n';
import QuantitySelector from '@woocommerce/base-components/quantity-selector';
import ProductPrice from '@woocommerce/base-components/product-price';
import ProductName from '@woocommerce/base-components/product-name';
import {
	useStoreCartItemQuantity,
	useStoreEvents,
	useStoreCart,
} from '@woocommerce/base-context/hooks';
import {
	ProductBackorderBadge,
	ProductImage,
	ProductLowStockBadge,
	ProductMetadata,
	ProductSaleBadge,
} from '@woocommerce/base-components/cart-checkout';
import {
	getCurrencyFromPriceResponse,
	Currency,
} from '@woocommerce/price-format';
import {
	__experimentalApplyCheckoutFilter,
	mustBeString,
	mustContain,
} from '@woocommerce/blocks-checkout';
import Dinero from 'dinero.js';
import { useCallback, useMemo } from '@wordpress/element';
import type { CartItem } from '@woocommerce/type-defs/cart';
import { objectHasProp } from '@woocommerce/base-utils';
import { getSetting } from '@woocommerce/settings';

/**
 * Convert a Dinero object with precision to store currency minor unit.
 *
 * @param {Dinero} priceObject Price object to convert.
 * @param {Object} currency    Currency data.
 * @return {number} Amount with new minor unit precision.
 */
const getAmountFromRawPrice = (
	priceObject: Dinero.Dinero,
	currency: Currency
) => {
	return priceObject.convertPrecision( currency.minorUnit ).getAmount();
};

/**
 * Cart line item table row component.
 *
 * @param {Object} props
 * @param {CartItem|Object} props.lineItem
 */
const CartLineItemRow = ( {
	lineItem,
}: {
	lineItem: CartItem | Record< string, never >;
} ): JSX.Element => {
	const {
		name: initialName = '',
		catalog_visibility: catalogVisibility = 'visible',
		short_description: shortDescription = '',
		description: fullDescription = '',
		low_stock_remaining: lowStockRemaining = null,
		show_backorder_badge: showBackorderBadge = false,
		quantity_limit: quantityLimit = 99,
		permalink = '',
		images = [],
		variation = [],
		item_data: itemData = [],
		prices = {
			currency_code: 'USD',
			currency_minor_unit: 2,
			currency_symbol: '$',
			currency_prefix: '$',
			currency_suffix: '',
			currency_decimal_separator: '.',
			currency_thousand_separator: ',',
			price: '0',
			regular_price: '0',
			sale_price: '0',
			price_range: null,
			raw_prices: {
				precision: 6,
				price: '0',
				regular_price: '0',
				sale_price: '0',
			},
		},
		totals = {
			currency_code: 'USD',
			currency_minor_unit: 2,
			currency_symbol: '$',
			currency_prefix: '$',
			currency_suffix: '',
			currency_decimal_separator: '.',
			currency_thousand_separator: ',',
			line_subtotal: '0',
			line_subtotal_tax: '0',
		},
		extensions = {},
	} = lineItem;

	const {
		quantity,
		setItemQuantity,
		removeItem,
		isPendingDelete,
	} = useStoreCartItemQuantity( lineItem );
	const { dispatchStoreEvent } = useStoreEvents();

	const productPriceValidation = useCallback(
		( value ) => mustBeString( value ) && mustContain( value, '<price/>' ),
		[]
	);

	// Prepare props to pass to the __experimentalApplyCheckoutFilter filter.
	// We need to pluck out receiveCart.
	// eslint-disable-next-line no-unused-vars
	const { receiveCart, ...cart } = useStoreCart();
	const arg = useMemo(
		() => ( {
			context: 'cart',
			cartItem: lineItem,
			cart,
		} ),
		[ lineItem, cart ]
	);
	const priceCurrency = getCurrencyFromPriceResponse( prices );
	const name = __experimentalApplyCheckoutFilter( {
		filterName: 'itemName',
		defaultValue: initialName,
		extensions,
		arg,
		validation: mustBeString,
	} );

	const regularAmountSingle = Dinero( {
		amount: parseInt( prices.raw_prices.regular_price, 10 ),
		precision: prices.raw_prices.precision,
	} );
	const purchaseAmountSingle = Dinero( {
		amount: parseInt( prices.raw_prices.price, 10 ),
		precision: prices.raw_prices.precision,
	} );
	const saleAmountSingle = regularAmountSingle.subtract(
		purchaseAmountSingle
	);
	const saleAmount = saleAmountSingle.multiply( quantity );
	const totalsCurrency = getCurrencyFromPriceResponse( totals );
	let lineSubtotal = parseInt( totals.line_subtotal, 10 );
	if ( getSetting( 'displayCartPricesIncludingTax', false ) ) {
		lineSubtotal += parseInt( totals.line_subtotal_tax, 10 );
	}
	const subtotalPrice = Dinero( {
		amount: lineSubtotal,
		precision: totalsCurrency.minorUnit,
	} );

	const firstImage = images.length ? images[ 0 ] : {};
	const isProductHiddenFromCatalog =
		catalogVisibility === 'hidden' || catalogVisibility === 'search';

	// Allow extensions to filter how the price is displayed. Ie: prepending or appending some values.

	const productPriceFormat = __experimentalApplyCheckoutFilter( {
		filterName: 'cartItemPrice',
		defaultValue: '<price/>',
		extensions,
		arg,
		validation: productPriceValidation,
	} );

	const subtotalPriceFormat = __experimentalApplyCheckoutFilter( {
		filterName: 'subtotalPriceFormat',
		defaultValue: '<price/>',
		extensions,
		arg,
		validation: productPriceValidation,
	} );

	const saleBadgePriceFormat = __experimentalApplyCheckoutFilter( {
		filterName: 'saleBadgePriceFormat',
		defaultValue: '<price/>',
		extensions,
		arg,
		validation: productPriceValidation,
	} );

	return (
		<tr
			className={ classnames( 'wc-block-cart-items__row', {
				'is-disabled': isPendingDelete,
			} ) }
		>
			{ /* If the image has no alt text, this link is unnecessary and can be hidden. */ }
			<td
				className="wc-block-cart-item__image"
				aria-hidden={
					! objectHasProp( firstImage, 'alt' ) || ! firstImage.alt
				}
			>
				{ /* We don't need to make it focusable, because product name has the same link. */ }
				{ isProductHiddenFromCatalog ? (
					<ProductImage image={ firstImage } />
				) : (
					<a href={ permalink } tabIndex={ -1 }>
						<ProductImage image={ firstImage } />
					</a>
				) }
			</td>
			<td className="wc-block-cart-item__product">
				<ProductName
					disabled={ isPendingDelete || isProductHiddenFromCatalog }
					name={ name }
					permalink={ permalink }
				/>
				{ showBackorderBadge ? (
					<ProductBackorderBadge />
				) : (
					!! lowStockRemaining && (
						<ProductLowStockBadge
							lowStockRemaining={ lowStockRemaining }
						/>
					)
				) }

				<div className="wc-block-cart-item__prices">
					<ProductPrice
						currency={ priceCurrency }
						regularPrice={ getAmountFromRawPrice(
							regularAmountSingle,
							priceCurrency
						) }
						price={ getAmountFromRawPrice(
							purchaseAmountSingle,
							priceCurrency
						) }
						format={ subtotalPriceFormat }
					/>
				</div>

				<ProductSaleBadge
					currency={ priceCurrency }
					saleAmount={ getAmountFromRawPrice(
						saleAmountSingle,
						priceCurrency
					) }
					format={ saleBadgePriceFormat }
				/>

				<ProductMetadata
					shortDescription={ shortDescription }
					fullDescription={ fullDescription }
					itemData={ itemData }
					variation={ variation }
				/>

				<div className="wc-block-cart-item__quantity">
					<QuantitySelector
						disabled={ isPendingDelete }
						quantity={ quantity }
						maximum={ quantityLimit }
						onChange={ ( newQuantity ) => {
							setItemQuantity( newQuantity );
							dispatchStoreEvent( 'cart-set-item-quantity', {
								product: lineItem,
								quantity: newQuantity,
							} );
						} }
						itemName={ name }
					/>
					<button
						className="wc-block-cart-item__remove-link"
						onClick={ () => {
							removeItem();
							dispatchStoreEvent( 'cart-remove-item', {
								product: lineItem,
								quantity,
							} );
						} }
						disabled={ isPendingDelete }
					>
						{ __( 'Remove item', 'woo-gutenberg-products-block' ) }
					</button>
				</div>
			</td>
			<td className="wc-block-cart-item__total">
				<div className="wc-block-cart-item__total-price-and-sale-badge-wrapper">
					<ProductPrice
						currency={ totalsCurrency }
						format={ productPriceFormat }
						price={ subtotalPrice.getAmount() }
					/>

					{ quantity > 1 && (
						<ProductSaleBadge
							currency={ priceCurrency }
							saleAmount={ getAmountFromRawPrice(
								saleAmount,
								priceCurrency
							) }
							format={ saleBadgePriceFormat }
						/>
					) }
				</div>
			</td>
		</tr>
	);
};
export default CartLineItemRow;
